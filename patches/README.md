# patch-package patches

This directory contains patches applied by
[patch-package](https://github.com/ds300/patch-package) on `postinstall`. Each
patch has been reviewed and confirmed to be benign. This file exists so future
reviewers can understand intent without re-auditing from scratch.

---

## `@ethersproject+providers+5.7.2.patch`

**Purpose:** Fork-support for local development with `USE_MAINNET_FORK=true`.

When the `USE_MAINNET_FORK` env var is set the patch:

1. Redirects Alchemy RPC calls to `MAINNET_FORK_URL` (defaults to
   `http://localhost:8545`).
2. Forces `getNetwork()` to return chain ID 1 so the extension behaves as if it
   is on mainnet even when talking to a local Anvil fork.

The patch also includes cosmetic import-style normalisation (no functional
change). This patch is **only active during local fork testing** and has no
effect in production builds.

**Remove when:** `@ethersproject/providers` is replaced or when a first-class
fork-testing approach makes this unnecessary.

---

## `jsan+3.1.14.patch`

**Purpose:** Adds `BigInt` serialisation support to
[jsan](https://github.com/nicolo-ribaudo/jsan), which is used for
Redux-devtools message serialisation.

Upstream `jsan` does not handle `BigInt` values and throws when it encounters
one. The patch encodes BigInts as `{ B_I_G_I_N_T: value.toString() }` and
decodes them symmetrically. This is required because the Taho background
service uses `BigInt` extensively for token amounts.

**Upstream issue:** No upstream PR at time of writing; BigInt support is a known
gap in the library.

**Remove when:** Upstream adds native BigInt support or jsan is replaced.

---

## `@ledgerhq+hw-app-eth+6.33.4.patch`

**Purpose:** Fixes an ECC parity bug for Arbitrum Sepolia (chain ID 421614) in
legacy (pre-EIP-155) transactions.

For large chain IDs the `v` value in the ECDSA signature (used to recover the
public key) overflows. The upstream library incorrectly computed parity for
chain IDs > 109. The patch corrects the formula so that Ledger hardware wallets
can sign legacy transactions on Arbitrum Sepolia.

**Upstream issue:** Bug in `hw-app-eth` v6.33.4's v-value calculation for
large chain IDs in legacy transactions.

**Remove when:** Upstream ships a fix and the dependency is upgraded past the
fix version.

---

## `webext-redux+4.0.0.patch`

**Purpose:** Three bug fixes and one security hardening for the Redux store
proxy bridge used to share state between the background service worker and UI
pages.

1. **Message deduplication:** Tracks in-flight message IDs in a `Set` and
   silently drops duplicates, preventing double-state-updates when the service
   worker is woken multiple times by the same broadcast.
2. **Race condition guard (`readyResolved`):** Prevents `patchState` from
   running before the initial state has been hydrated, and prevents the "store
   ready" promise from resolving more than once.
3. **Consistent deserialiser application:** Ensures the configured deserialiser
   is applied uniformly to all incoming state (initial hydration, patches, and
   dispatch responses), not just the initial fetch.
4. **Sender origin validation:** `filterStateMessages` and
   `filterActionMessages` now verify that the message sender URL starts with
   `browserAPI.runtime.getURL("")` — the exact `chrome-extension://ID/` (or
   `moz-extension://ID/`) origin of this extension. This blocks two threat
   actors:
   - _Foreign extension_: another installed extension cannot dispatch Redux
     actions (e.g. `exportPrivateKey`) by guessing the channel name. This
     closes the gap on Firefox where `externally_connectable` has no effect.
   - _Compromised content script_: a content script (even one injected by this
     extension) carries the host-page URL, not the extension origin, so it
     cannot reach the background Redux store even if the script is tampered
     with.

**Upstream issue:** These are accumulated bug fixes that have not been merged
upstream. The `webext-redux` project is largely unmaintained at v4.

**Remove when:** Upstream incorporates these fixes or the library is replaced.
