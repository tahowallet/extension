# Critique: Implementing RFB 5 (Control-compatible addresses)

## Executive summary

RFB 5's architecture — control compatibility answered by the
`SigningService` using known evidence, transaction compatibility answered
per signer service — fits the codebase well. The definition is sound as
written: three sufficient conditions establish *known* compatibility, and
everything else is simply not known, which the method reports as `false`.
Five clusters of change are needed to make it real.

**First, refresh the spec's references.** `KeyringService` is now
`InternalSignerService`; the `private-key` and `read-only` signer types
need covering (read-only contributes no evidence → not known); PR 2577's
Ledger abstractions never merged; and the API must be async
(`Promise<boolean>`), since the UI consumes state through synchronous
selectors and will need compatibility mirrored into Redux.

**Second, build the missing foundation: a background signer registry.**
The first two compatibility conditions require answering "which signers
control this address," and nothing in the background can — the only
address→signer map is a UI Redux selector, and
`SigningService.addressHandlers` is write-only dead code. A
startup-hydrated, lock-independent registry supporting multiple signers per
address is the prerequisite for both conditions.

**Third, implement transaction compatibility honestly.** Internal signers
trivially return true for EVM pairs. Ledger compatibility, however, is a
property of each account's derivation path, not the signer type — the RFB's
optional `AccountSigner` parameter should be mandatory — and the existing
inline path check is vacuous (it compares against Ethereum's *undefined*
path) and must be normalized, generalized, and applied to all signing
methods.

**Fourth, define the "not known" behavior per surface.** The RFB
deliberately leaves this unstated, but implementation cannot: with the
name-service-ownership condition deferred, every third-party Send
recipient is "not known," so the Send page must take the RFB's own
warn-don't-block adjustment or ENS recipients break on every network. Name
fan-out and network-switch account cloning should act only on *known*
compatibility. Supporting detail: the ENS resolver currently resolves on
mainnet and relabels results with the requested network, so the name
machinery's inputs must be made honest before any warning can be truthful.

**Fifth, wire up consumers.** Persist the address book (an in-memory array
today, lost on restart), thread `AddressOnNetwork` through the Send input
stack, re-key address-only selectors, mirror compatibility into Redux,
gate the network-switch account fan-out, and migrate existing incompatible
tracked accounts.

Sequenced this way, each step is independently shippable and the vision is
achievable without disruptive rewrites.

---

## Scope and method

This document reviews [RFB 5](./rfb-5-control-compatile-addresses.md)
against the current state of the codebase and identifies the changes —
mostly to the code, in a few places to the RFB's text — necessary to
implement it successfully. File references point at the current `main`
lineage of this repository.

One framing note that governs the rest of the document. The RFB defines
control compatibility by enumerating the cases where the wallet should
*assume* an address is control-compatible: the wallet holds private key
material, a hardware wallet holds it and the networks are
transaction-compatible, or (deferred) name-service ownership matches on
both networks. These are sufficient conditions, not an exhaustive
decision procedure — an address that matches none of them is *not known*
to be control-compatible, and `isControlCompatible` correctly returns
`false` for it. The signer registry discussed below is an implementation
detail serving the first two conditions, just as resolution provenance
(§6) is an implementation detail serving name handling; neither is a rival
concept to control compatibility. What the RFB leaves unstated — and what
implementation must decide surface by surface — is what the wallet *does*
when compatibility is not known.

## 1. The RFB references a codebase that has drifted

None of this is fatal, but the RFB text needs a refresh before anyone
implements from it:

- **`KeyringService` no longer exists.** It was renamed to
  `InternalSignerService` (`background/services/internal-signer/index.ts`),
  and it now manages *two* signer types: `keyring` (HD keyrings) and
  `private-key` (single imported keys, `PrivateKeyAccountSigner`). The RFB's
  "each account with a signer has an associated service (currently,
  `LedgerService` and `KeyringService`)" needs updating, and the
  compatibility table's "Private key import" row is already real code rather
  than hypothetical.
- **There is a fourth signer type the RFB never mentions: `read-only`.**
  `AccountSigner` (`background/services/signing/index.ts:57-64`) includes
  `ReadOnlyAccountSigner`, which has *no backing service* to which an
  `isTransactionCompatible` call could be delegated. The signing service
  uses `assertUnreachable` exhaustiveness switches, so an implementation
  will be forced to decide. The decision is easy under the RFB's own
  definition — a read-only "signer" contributes no evidence of control, so
  it establishes nothing and the answer stays "not known" — but the RFB
  should say so explicitly.
- **PR 2577 never merged.** The RFB's footnote 2 says the PR "has introduced
  some distinctions at the Ledger level," but as of this writing the PR is
  still open with merge conflicts (last activity mid-2023). The only Ledger
  app/network awareness that actually shipped is (a) a per-device
  `isArbitraryDataSigningEnabled` flag read from the Ethereum app's
  configuration, and (b) an inline derivation-path check in
  `LedgerService.signMessage` (see §4). The implementation cannot lean on PR
  2577's abstractions; they don't exist.
- **Naming inconsistencies in the RFB itself.** The method is declared as
  `isControlCompatible` but both examples call
  `signingService.isAddressControlCompatible`. Pick one (the former, since
  it also accepts names). Also, the file is named
  `rfb-5-control-compatile-addresses.md` — "compatile" — which is worth
  fixing while touching it.

## 2. Prerequisite for the first two conditions: the background cannot currently answer "which signers control address X?"

The RFB's first two compatibility conditions, and its algorithm step "if
there is no known signer for that address, return `false`," presume an
address→signer lookup in the background. That lookup does not exist:

- `SigningService` never resolves signers. Every signing method takes an
  already-resolved `AccountSigner` from its caller and switches on
  `accountSigner.type` (`background/services/signing/index.ts:134-158`).
- The one candidate structure, `SigningService.addressHandlers`
  (`signing/index.ts:66-69, 93, 230-232`), is **write-only dead code**: it
  is appended to on new-address events, stores only the `SignerType` (not
  the full signer), is never persisted, is never hydrated on startup (so it
  is empty for all pre-existing accounts after every service-worker
  restart), and is never read anywhere in the repo.
- The *actual* authoritative address→signer map lives in the UI, as the
  Redux selector `selectAccountSignersByAddress`
  (`background/redux-slices/selectors/signingSelectors.ts:29-115`), keyed by
  bare address across all chains, with conflicts resolved by a hardcoded
  priority order (keyring wins over Ledger and private key). Background
  services cannot call Redux selectors.

**Required change:** build a real signer registry in the background —
either resurrect `addressHandlers` into a persisted/startup-hydrated map of
`address → AccountSigner[]`, or add a `getSignersForAddress(address)`
fan-out that queries `InternalSignerService` and `LedgerService`
(`LedgerDatabase.getAccountByAddress` is already public;
`InternalSignerService.#findSigner` would need a public, *non-throwing*
wrapper). Two wrinkles either way:

1. **Lock state.** `InternalSignerService` throws when locked
   (`requireUnlocked`). If the registry's answers vary with lock state, the
   wallet's *knowledge* of control compatibility would appear and disappear
   with unlock, and the UI would show different names/warnings before and
   after. A registry hydrated from persisted metadata (keyring/private-key
   metadata is available without decrypting key material) keeps the
   knowledge stable.
2. **Signer multiplicity.** One address can be controlled by several
   signers (the selector's priority hack exists precisely because of
   this). The RFB implicitly assumes one signer per address. Since any one
   of the RFB's conditions suffices, `isControlCompatible` should be
   defined as "true if *any* known signer for the address establishes
   compatibility across the pair," and the RFB text should say so.

## 3. The address-format precondition has no data to consult

RFB: "the 2 networks must have the same address format." This is currently
implementable only as a constant:

- `NetworkFamily` is a single-member union, `"EVM"`
  (`background/networks.ts:13-17`). `AddressOnNetwork` and `NameOnNetwork`
  are in fact hardcoded to `EVMNetwork`, not `AnyNetwork`
  (`background/accounts.ts:38-52`), so the multi-family flexibility the RFB
  wants to preserve is already closed off at the type level.
- `Network` carries no address-format descriptor. SLIP-44 `coinType` exists
  only on `NetworkBaseAsset` and is write-only metadata — nothing reads it
  for path or format decisions.
- Custom networks added via `wallet_addEthereumChain`
  (`ChainService.addCustomChain`, `background/services/chain/index.ts` and
  `db.ts:270-305`) get neither a `derivationPath` nor a `coinType`, so any
  format field added to `Network` needs a default in the custom-network
  constructor and a Dexie migration for already-persisted networks.

**Required change:** for the initial implementation, define the check as
`network1.family === network2.family` and *document* that this is the
address-format check (it is trivially true today, which matches the RFB
table — every listed EVM pair passes and BTC is unrepresentable anyway).
If/when a non-EVM family lands, add an explicit `addressFormat` (or
network-level `coinType`) field. One subtlety worth capturing in the RFB:
Rootstock uses EIP-1191 chain-specific checksums, currently handled by two
hardcoded `chainID === ROOTSTOCK.chainID` branches
(`ui/hooks/validation-hooks.ts:166-176`,
`background/services/internal-ethereum-provider/index.ts:418-451`). "Same
address format" is thus not purely binary even within the EVM family — the
same underlying bytes have network-specific display/validation rules — and
a format descriptor on `Network` would let those branches be data-driven.

## 4. `isTransactionCompatible`: trivial for internal signers, genuinely hard for Ledger

**`InternalSignerService`** can return `true` for any EVM/EVM pair — it holds
raw key material and every lookup is already network-blind. Note the stored
keyring `path` does not need to enter the predicate: a keyring created at
the RSK derivation path derives *different addresses*, each of which the
service can sign for on any EVM chain.

**`LedgerService`** is where the RFB's simplification — "transaction
compatibility … is a property of the signer *type*, not the specific
signer" — breaks down, for three reasons:

1. **The existing logic is inline, one-sided, and subtly vacuous.** The only
   per-network Ledger gate in the codebase is in `signMessage`
   (`background/services/ledger/index.ts:550-565`): reject if
   `network.derivationPath` differs from `ETHEREUM.derivationPath` and
   doesn't share its prefix. But `ETHEREUM.derivationPath` is `undefined`
   (only Rootstock declares a path, `background/constants/networks.ts:31`),
   so the predicate reduces to "reject any network that declares a
   derivation path." It happens to give the right answers today, for the
   wrong reason. Extracting this into
   `isTransactionCompatible(network, otherNetwork)` requires normalizing
   `undefined` to the Ethereum default (`m/44'/60'/0'/0`) and comparing the
   two networks to each other rather than each to Ethereum. It should also
   then be applied to `signTransaction` and `signTypedData`, which today
   have *no* network gate at all (`checkCanSign` validates only
   path/device identity).
2. **Compatibility is per-account, not per-type.** The onboarding flow lets
   users derive Ledger accounts at the RSK path
   (`ui/components/Onboarding/OnboardingDerivationPathSelect.tsx`), and
   `LedgerAccountSigner` carries `path`. An account imported at
   `m/44'/137'/…` is signable by the RSK app, not the Ethereum app — the
   opposite compatibility profile from an Eth-path account on the same
   device. The RFB's escape hatch ("the `AccountSigner` could be taken as a
   parameter") should not be optional: **take the `AccountSigner` from day
   one.** The signature becomes
   `isTransactionCompatible(signer, network, otherNetwork)`; internal
   signers ignore the first argument.
3. **Static answers vs. runtime device state.** The RFB defines
   transaction-compatible as "without requiring any manipulation on the
   hardware wallet." Whether the RSK app is even installed is runtime
   device state the service only learns while connected. A boolean is still
   the right initial API, but the implementation should document that it
   answers "compatible in principle given the derivation path," not "the
   device is ready right now" — the latter remains the signing flow's job
   (`useSigningLedgerState`, which today ignores network entirely:
   `ui/hooks/signing-hooks.ts:84-118`).

Related data-model constraint: `LedgerDatabase`'s primary key is
`&address` (`background/services/ledger/db.ts:18`) — one derivation path per
address globally. That is compatible with the per-account approach above,
but forecloses "the same address reachable at different paths per network";
if that ever matters, a schema migration is needed.

## 5. API shape: async, name handling, and the meaning of `false`

- **`boolean` should be `Promise<boolean>`.** Every cross-service call in
  this codebase is async, and a registry-backed lookup (or worse, a Ledger
  DB read) certainly is. The RFB's synchronous signature is an
  implementation trap: the UI consumes state through *synchronous* Redux
  selectors, so a promise-returning service method cannot be called from
  render paths at all. The practical consequence (see §7) is that
  compatibility must be *pushed into Redux state* by the background —
  e.g., a per-address map of compatible chainIDs, or a
  `(signerType, path) → compatible-networks` table — recomputed when
  accounts or networks change, rather than pulled on demand.
- **The `NameOnNetwork` overload needs a resolution step the
  `SigningService` doesn't have.** Checking a name means first resolving it
  to an address on its network, which is `NameService`'s job — a dependency
  `SigningService` doesn't currently carry. This is a layering decision,
  not a spec problem: either inject `NameService` (which also positions the
  service for the RFB's third condition, name-service ownership, if that is
  ever implemented), or have callers resolve first and pass the
  `AddressOnNetwork` — every flow that matters already holds a
  `ResolvedAddressRecord`. The latter is less plumbing for the initial
  implementation; the RFB doesn't need to change either way, but the
  implementation should pick deliberately.
- **`false` means "not known," and one sub-case is stronger.** Per the
  RFB's definition, `false` covers everything from "no evidence at all" to
  "the address formats differ, so compatibility is impossible." Those have
  the same *safety* consequence (don't assume the same user controls the
  address), so a boolean is a defensible v1. But UI copy will likely want
  to distinguish "we can't verify this" from "this cannot be the same
  address" — worth a note in the RFB, and an easy later extension (e.g. a
  three-valued result) that shouldn't block the boolean version.

## 6. The unstated half of the spec: what to do when compatibility is not known

The RFB focuses, correctly, on identifying the cases where compatibility
*is* known. It deliberately does not say what each surface should do when
it isn't — and implementation cannot ship without deciding, because "not
known" will be the overwhelmingly common answer on the highest-traffic
surface:

- **Send-page recipients.** For a third-party recipient the wallet holds no
  signer, and the RFB's only condition that could apply — name-service
  ownership matching on both networks — is explicitly deferred ("most
  likely not worth implementing at this time"). So until that condition
  exists, essentially every external recipient resolves to "not known."
  The RFB already anticipates the right behavior: "this might be adjusted
  by giving the user warning feedback that the address is known (and
  allowing the name to be used) but not guaranteed to be controlled by the
  same person." That adjustment should be treated as the v1 requirement,
  not an option — a strict reading ("only considered resolved if
  control-compatible") would reject every ENS recipient on every network,
  including mainnet, and no one will accept that regression.
- **Name fan-out and account display** (§7) should act only on *known*
  compatibility: show a saved account name on another network when the
  compatibility conditions hold, fall back to per-network behavior when
  they don't.
- **Network switching** (§7) likewise: known-incompatible or unknown
  accounts can still be cloned onto a new network (the user may control
  them by other means), but the data recording that distinction should be
  kept so the display layer — which the RFB explicitly leaves to the design
  team — has something to work with.

For the warning feedback to be *truthful*, the name machinery's inputs
need fixing — an implementation detail of name handling, in the same way
the signer registry is an implementation detail of the signer-backed
conditions:

- The ENS resolver hardcodes the Ethereum mainnet provider and then stamps
  the *caller's* network onto the result
  (`background/services/name/resolvers/ens.ts:50-67, 104-107`), so a
  mainnet ENS record is reported as an address "on" Polygon, Rootstock, or
  Mezo. The `NameResolver` contract ("the resolver MUST return results for
  the same network that was passed," `name-resolver.ts:9-11`) is satisfied
  only nominally; the network field is a passthrough of the request, not a
  property of the resolution. The RFB's own rule — "if the ENS resolver on
  Ethereum mainnet returns an address for the name, that address should be
  considered to be valid on Ethereum mainnet" — requires resolvers to
  report where a record actually resolved (e.g., a `resolvedOn`/
  `resolvedVia` field alongside the requested network). This is also the
  substrate the deferred name-service-ownership condition would need.
- The UI then discards even the manufactured network:
  `useAddressOrNameValidation` returns `{ address, name? }` with no network
  (`ui/hooks/validation-hooks.ts:144, 192`), and `Send.tsx` stores a bare
  string and re-attaches the *sender's* current network
  (`ui/pages/Send.tsx:84-86, 150-159`). The RFB's fidelity rule ("the
  network information … should be present so that fidelity is not lost")
  needs to be applied through `useAddressOrNameValidation`,
  `SharedAddressInput`, and `Send.tsx`, carrying the full
  `AddressOnNetwork` plus resolver provenance to where the warning is
  rendered.

## 7. The consuming side: names, selectors, and network switching all need plumbing

Even with both methods implemented, nothing can consume them yet:

- **The address book must be persisted first.** The RFB's motivating
  feature rests on `PreferencesService`'s address book, which is a
  non-persisted in-memory array (`background/services/preferences/index.ts:174`,
  with the `TODO Implement … stored in the database` at lines 225-226).
  Renames are lost on every service-worker restart — before any
  cross-network behavior is even reachable. A Dexie table plus migration is
  a prerequisite, and per-`(address, network)` keying should be kept, since
  control compatibility is exactly the machinery that later *reads across*
  those keys.
- **Name fan-out needs a strategy.** A rename today writes one per-chain
  Redux leaf (`accountsData.evm[chainID][address].ens.name`,
  `background/redux-slices/accounts.ts:286-316`) and clears one per-chain
  name-cache entry (`background/services/name/index.ts:131-137`). Two
  viable designs: write-time fan-out (on rename, `NameService` re-resolves
  the address on every tracked network, and the address-book resolver
  answers for any network where compatibility is known) or read-time
  resolution (selectors consult a compatibility map in Redux). Write-time
  fan-out fits the existing event flow better, but must also fire when
  *new networks are added* (including custom chains), or names will be
  missing on chains added after the rename.
- **Selectors are mis-keyed for the RFB's model.** `selectCurrentAccountSigner`
  indexes by address only, discarding `selectedAccount.network`
  (`signingSelectors.ts:117-122`); `ui/components/Signing/index.tsx:106`
  resolves the signer from the *selected* account rather than the signing
  request's `from`; `selectAccountTotalsForOverview` collapses to one
  `ensName` per address with first-chain-iterated-wins semantics
  (`accountsSelectors.ts:625-671`). These need to become
  `AddressOnNetwork`-keyed (or compatibility-aware) as part of, or
  immediately after, the core work — otherwise the UI will keep
  contradicting whatever the services correctly compute.
- **Network switching is the natural first gate.** `setSelectedNetwork`
  unconditionally clones every address onto the newly selected network
  (`background/redux-slices/ui.ts:381-399`) — a Ledger Eth-path account gets
  tracked on Rootstock, where it cannot sign. Once `isControlCompatible`
  exists, this loop should consult it and record the answer per §6 (the
  RFB explicitly leaves the display question to design; the *data* should
  still be recorded). Note the mirror-image operations are inconsistent
  today and will need alignment: `deleteAccount` and
  `ChainService.removeAccountToTrack(address)` remove an address from
  *all* chains while taking per-network inputs.
- **Existing user data needs a cleanup pass.** Users already have
  incompatible `(address, network)` tracking rows (e.g. Ledger accounts
  fanned onto Rootstock by past network switches). Implementation should
  include a migration or reconciliation step, not just new-write gating.

## 8. Smaller items

- **Testing baseline is thin but the hooks exist.** `SigningService` has
  three unit tests (all `deriveAddress`); factories in
  `background/tests/factories.ts` (`createSigningService`,
  `createLedgerService`, `createInternalSignerService`) are the right place
  to build compatibility fixtures. The name service's integration tests
  already contain `it.todo`s for exactly the cross-network caching
  behaviors this RFB touches.
- **`isSameAccountSignerWithId` ignores Ledger `path`**
  (`background/utils/signing.ts:142-161`), so two Ledger accounts at
  different paths on one device compare equal — a latent bug that becomes
  live the moment compatibility is path-sensitive (§4.2).
- **`sameNetwork`'s doc comment claims it verifies name; it doesn't**
  (`background/networks.ts:363-374`). Trivial, but it will be load-bearing
  in every compatibility check, so fix the comment or the behavior.
- **EIP-2612 enrichment hardcodes `network: ETHEREUM`** for its lookups
  (`background/services/enrichment/utils.ts:51-59`) — another
  network-fidelity leak in a flow the RFB says should carry
  `AddressOnNetwork` end to end.

## Suggested sequencing

1. Refresh the RFB (service names, `private-key`/`read-only` types,
   `Promise<boolean>`, mandatory `AccountSigner` parameter, any-signer
   semantics for multi-signer addresses, PR 2577 status; optionally, a
   note on distinguishing "unknown" from "impossible" and a sentence
   making warn-don't-block the specified Send behavior).
2. Persist the address book (Dexie table + migration).
3. Build the background signer registry (startup-hydrated,
   lock-independent) with `getSignersForAddress`.
4. Implement `isTransactionCompatible` on `InternalSignerService`
   (constant `true`) and `LedgerService` (extract, normalize, and
   generalize the `signMessage` path check; apply it to all three signing
   methods); `read-only` contributes no evidence in the dispatcher.
5. Implement `SigningService.isControlCompatible` with family-equality as
   the format check; mirror results into a Redux compatibility map for
   synchronous selector use.
6. Fix resolver provenance (ENS especially) and thread
   `AddressOnNetwork` through the Send input stack, rendering the RFB's
   warning feedback when compatibility is not known.
7. Gate name fan-out on known compatibility; record compatibility during
   `setSelectedNetwork` fan-out; reconcile existing tracked-account data;
   align the removal paths.
