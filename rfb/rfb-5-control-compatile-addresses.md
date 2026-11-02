# RFB 5: Control-compatible addresses

## Background

The Taho wallet was built with the intent of supporting not only multiple
networks, but multiple networks that might be of different types (e.g.,
non-EVM). This was a core design strategy, but it's often the case that
ongoing development can deprioritize certain thinking that maintains the
underlying flexibility needed to represent these differences.

Currently, the code base assumes that a given address is always controlled by
the same underlying key, keyring, or external device, even if it is on a
different network. For regular keys, in practice, this is a fair assumption: if
Bob has a mnemonic that can sign for address `0x0abc` with a derivation path of
`44'/60'/0'/0/0`, it's extremely unlikely that Bob will ALSO have a different
key that can sign for the same address but at derivation path
`44'/137'/0'/0/0`. For this to happen, Bob would more or less have to have two
different mnemonics that derive the same private key at two different
derivation paths!

The assumption, however, falls apart when it comes to accounts that are not
derived or controlled directly by in-memory private keys. For example, if Bob
is viewing the Ethereum network and has a key stored on a Ledger for `0x0abc`
at `44'/60'/0'/0/0` and can sign a transaction for that address, they can
interact with everything as expected--dApps, etc. If Bob switches to the
Rootstock network, on the other hand, and they control that key using a Ledger,
Ledger itself might require a different app to sign a transaction for that key
on Rootstock, and so may have to take additional steps to be able to control
the same address.

This is only the simplest scenario. A more complex scenario appears if the
address in question is actually a smart contract or account abstraction-based
wallet. In these cases, the controls for an address on one network may differ
wildly from those on a different network. A good example of this scenario is
the Wintermute Optimism hack, where a market maker provided the Optimism team
with an Ethereum mainnet multisig address that they did not control on the
Optimism network, and lost the funds sent to that address on Optimism[^1].

### Current Functionality

Currently addresses are often (but not always!) carried in objects conforming to
`AddressOnNetwork`:

```typescript
/**
 * An address on a particular network. That's it. That's the comment.
 */
export type AddressOnNetwork = {
  address: HexString
  network: EVMNetwork
}
```

Additionally, _names_, which give addresses a human-readable name, are
generally carried in objects conforming to `NameOnNetwork`:

```typescript
/**
 * A domain name, with a particular network.
 */
export type NameOnNetwork = {
  name: string
  network: EVMNetwork
}
```

Note however that there are cases where this information is not included
alongside addresses or names, or doesn't reflect where the data came from.
Addresses the wallet can't sign for have a read-only signer.

[^1]: See https://plaid-cement-e44.notion.site/A-Message-to-the-Community-from-the-Optimism-Foundation-f49b913bb0974d8a854a8bdd409a9dd6

## Proposal

This RFB focuses on codifying an approach for encoding information about an
address's known control characteristics on a given network. In particular, the
goal is for an address to have enough information carried with it that the UI
and internal services can inform the user whether an address is known to exist
and correspond to the same user on multiple networks or not.

#### Control Compatibility

To allow the above, we can introduce two concepts for any given pair of networks:

- Two networks are _transaction-compatible_ for a given external wallet if the
  wallet can sign a transaction for both networks from the same key material.
  Switching apps on a hardware wallet is acceptable, as long as the same key
  material signs for the address on both networks[^2].
- An _address_ is considered _control-compatible_ across the pair of networks
  if it is known to be controllable by the same mechanism across those
  networks; that is, when the wallet knows for certain that the same user can
  sign for that address across both networks.

These are the cases where the wallet should assume an address is
control-compatible across 2 networks:

- The wallet controls private key material for the address (e.g. the address is
  derived from an internal keyring, or was imported as a private key).
- The address was derived from a hardware wallet that controls private key
  material for the address AND the networks are transaction-compatible[^2].
- The address has been resolved via a name service lookup on both networks and
  the owner of the records is the same on both networks.[^3] This can change
  over time, so rather than monitoring ownership for changes, the wallet checks
  this condition at the moment it's needed (see
  [Implementation](#implementation)).

In addition to these 3 possible paths, the 2 networks must have the same
address format; e.g., an address cannot be control-compatible between Ethereum
and Bitcoin, since the address formats are different). All networks the wallet
currently supports are EVM networks, so in practice this check currently
reduces to comparing network families; how address formats are represented
once a non-EVM family is added is left to that work.

These conditions are sufficient, not exhaustive. An address that meets none of
them is not _known_ to be control-compatible, which is different from being
known _not_ to be. When more than one signer can sign for an address, any one
of them meeting a condition is sufficient. A read-only address has no signer
and the wallet holds no key material for it, so the first two conditions can
never apply; it can only be control-compatible via the name service
condition.

This table visualizes when an Ethereum address might be control-compatible with
another network:

| Source                 | Network | Control-compatible? | Reason             |
| ---------------------- | ------- | ------------------- | ------------------ |
| New `HDKeyring`        | Polygon | Yes                 | Private key        |
| New `HDKeyring`        | RSK     | Yes                 | Private key        |
| New `HDKeyring`        | BTC     | No                  | Address format[^4] |
| Private key import     | Polygon | Yes                 | Private key        |
| Private key import     | RSK     | Yes                 | Private key        |
| Private key import     | BTC     | No                  | Address format     |
| Ledger (Ethereum path) | Polygon | Yes                 | Tx compatible      |
| Ledger (Ethereum path) | RSK     | Yes                 | Tx compatible      |
| Ledger (Ethereum path) | BTC     | No                  | Address format     |
| Ledger (RSK path)      | RSK     | Yes                 | Tx compatible[^6]  |
| WalletConnect Safe[^5] | Polygon | No                  | Tx incompatible    |
| WalletConnect Safe     | RSK     | No                  | Tx incompatible    |
| WalletConnect Safe     | BTC     | No                  | Address format     |
| Read-only address      | Polygon | No                  | No known signer    |
| ENS name, same records | Polygon | Yes                 | Name service[^3]   |

[^2]:
    Hardware wallets can in some cases distinguish by which app can operate
    on a network based on the derivation path or transaction structure. The code
    doesn't currently have an abstracted concept of this across hardware wallets,
    and most of the Ledger code is itself written with the assumption of using the
    Ethereum app. [PR 2577](https://github.com/tahowallet/extension/pull/2577)
    proposed some distinctions at the Ledger level, but has not been merged;
    the wallet does, however, already allow deriving Ledger accounts at
    Rootstock's derivation path during onboarding.

[^3]:
    Only ENS can satisfy this condition today. All of an ENS name's records are
    served by the single resolver set in the Ethereum mainnet registry, so
    their owner is always the same across networks, and the condition reduces
    to the name's records for both networks ([ENSIP-11][ensip11]) pointing at
    the same address. A default EVM record ([ENSIP-19][ensip19]) counts as a
    record for every EVM chain.

[^4]:
    This means the same address, i.e. the address corresponding to a given
    private key, is represented differently on this network than on Ethereum.

[^5]:
    Note that Taho doesn't currently support adding an external wallet via
    WalletConnect, but a hypothetical feature that supports this would have to
    contend with the fact that such a connection is only guaranteed to work on
    a specific network.

[^6]:
    A Ledger account at Rootstock's derivation path (`m/44'/137'/0'/0`) is
    signed for using Ledger's Rootstock app rather than its Ethereum app, so
    the user must install and switch to that app. Since the same key material
    still signs for the account, this counts as transaction-compatible. Note
    that today the Ledger service refuses to sign messages on Rootstock, though
    it places no such restriction on transactions.

[^7]:
    [ENSIP-19][ensip19] explicitly tells clients not to treat the Ethereum
    mainnet record as a default for other chains. Resolvers that support
    ENSIP-19 default EVM records already return the default when no
    chain-specific record is set.

### Implementation

Anywhere that an address or name is being used to transmit funds or data, the
base data type should be an `AddressOnNetwork` or `NameOnNetwork`. This should
be the case both on the way into the UI (e.g. when displaying autocompletes or
transaction information) AND on the way out of the UI (e.g. when requesting
signature or otherwise sending information into the services). The network
information may not always be needed or used, but it should be present so that
fidelity is not lost.

The intent is to allow the UI to manage addresses as tied one-to-one to
networks, and to allow flexibility behind the scenes for addresses that might
be known to be controlled by the same address on multiple networks. Having the
address and network (or name and network) is not sufficient to determine
control compatibility---but if both are available, a given service can query
the signing service to determine whether that `*OnNetwork` object is
control-compatible with a different network. The signing service tracks all
signers available to the wallet, and understands how to coordinate with
underlying signer types for common functionality like determining control
compatibility.

#### `SigningService` updates

The `SigningService` should add a new method:

```typescript
isControlCompatible(objectOnNetwork: AddressOnNetwork | NameOnNetwork,
otherNetwork: Network): Promise<boolean>

// Examples
await signingService.isControlCompatible(
  { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", network: ETHEREUM },
  BITCOIN // illustrative; non-EVM networks aren't currently supported
) // false

await signingService.isControlCompatible(
  { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", network: ETHEREUM },
  POLYGON
) // => true if we have a signer for it, and if the signer is transaction-compatible
  //    between Ethereum and Polygon

await signingService.isControlCompatible(
  { name: "vitalik.eth", network: ETHEREUM },
  POLYGON
) // => true if the name's Ethereum and Polygon records are the same address, or
  //    if we have a transaction-compatible signer for that address
```

This method should return `true` if the given networked object (address or
name) is known to be control-compatible on the specified `otherNetwork`, and
`false` otherwise---including when compatibility simply isn't known. To check
control compatibility, the signing service should check:

- If the two networks are the same network, return `true`.
- If the two networks have incompatible address formats, return `false`.
- For a `NameOnNetwork`, resolve the name on its network; if it doesn't
  resolve, return `false`.
- If there are one or more known signers for the address (internal, Ledger, or
  otherwise), the backing service for each signer should have a new
  implemented method, `isTransactionCompatible`, defined below; return `true`
  if any of them returns `true`.
- For a `NameOnNetwork`, return the result of the name service's new
  `isNameOwnershipCompatible` method, defined below.
- Otherwise, return `false`.

These steps require the signing service to track which signers can sign for a
given address, which no service currently does.

The signing service resolves names by calling into the name service, rather
than expecting callers to resolve names first: the name service condition
needs the name itself, not just the address it resolves to, so resolving ahead
of time would discard what that check needs. `SigningService` thus takes
`NameService` as a dependency, which introduces no cycle, since `NameService`
only depends on `ChainService` and `PreferenceService`.

The method is asynchronous, since finding the signers for an address may
require reading from storage, and checking a name requires network lookups.
Because the UI reads redux state synchronously, the proposed approach (which
may change during implementation) is:

- For the user's own accounts, the signing service computes control
  compatibility in the background and emits it, and `main` dispatches it into
  the `accounts` slice, alongside `accountsData`:

  ```typescript
  controlCompatibility: {
    // The chain IDs each address is known to be control-compatible with,
    // for each chain ID it's tracked on.
    [address: NormalizedEVMAddress]: { [chainID: string]: string[] }
  }
  ```

  The signing service recomputes an address's entry when accounts, signers, or
  networks are added or removed, and a selector such as
  `selectIsAddressControlCompatible(state, addressOnNetwork, otherNetwork)`
  reads it. Recording pairs rather than grouping networks avoids assuming
  compatibility is transitive. Only the signer-based conditions feed this map.

- For one-off checks, like a Send recipient, the UI dispatches an async thunk
  that calls `isControlCompatible` directly, as it already does for name
  resolution. The name service condition is only checked this way, at the
  moment it's needed, so the wallet never relies on a stale answer and doesn't
  need to monitor ownership for changes.

#### Signer service updates

Each account with a signer has an associated service (currently,
`LedgerService` and `InternalSignerService`, formerly `KeyringService`; see
RFB 4) that coordinates signing for that type of `AccountSigner`. Signer
service instances are singleton, but manage signing across multiple underlying
`AccountSigner`s of that type (e.g. multiple keyrings).

Each signer service should add a new method that looks roughly like this:

```typescript
isTransactionCompatible(network: Network, otherNetwork: Network): boolean

// Examples
ledgerService.isTransactionCompatible(
  ETHEREUM,
  ROOTSTOCK
) // => true irrespective of the signer

internalSignerService.isTransactionCompatible(
  ETHEREUM,
  ROOTSTOCK
) // => true irrespective of the signer
```

Note here that the underlying `AccountSigner` is irrelevant---transaction
compatibility between networks is considered to be a property of the signer
_type_, not the specific signer. A Ledger account's derivation path determines
which Ledger app signs for it, but since switching apps is acceptable, that
doesn't change the answer. `InternalSignerService` signs directly with private
key material, so an imported private key, which has no derivation path, is
handled the same way as a keyring-derived address. There may be cases where
this could differ
signer-by-signer; if that's the case, the `AccountSigner` could be taken as a
parameter.

Transaction compatibility answers whether the same key material can sign for
both networks, not whether a device is currently connected or has the right
app open; that remains the concern of the signing flow.

`LedgerService` currently has an ad hoc version of this check inline in its
message signing code, which should be replaced by `isTransactionCompatible`.

#### `NameService` updates

The `NameService` should add a new method that checks the name service
condition:

```typescript
isNameOwnershipCompatible(nameOnNetwork: NameOnNetwork,
otherNetwork: Network): Promise<boolean>
```

It should return `true` if the name resolves to the same address on both
networks through a name system whose records have the same owner across
networks, which for now means ENS (see the table above). To do this, the ENS
resolver needs to look up the record for each specific network, per ENSIP-11,
rather than always using the Ethereum mainnet record as it does today.

#### Specific case: name resolution

The initial motivation for control compatibility came from wanting to implement
address book functionality in Taho, and from wanting to extend existing
behind-the-scenes address book functionality (renaming an account added to Taho
uses a vestigial address book implementation in the `PreferenceService`, which
currently only keeps entries in memory). When a user renamed an account on one
network, switching networks would drop the name of the account, because Taho
only considered a name to apply to a single network. Exploring this problem
space led to the development of control compatibility as a concept.

For general name resolution, all names should be saved or resolved as on a
particular network---for example, if a user renames an account while on
Ethereum mainnet in the UI, the name should be persisted as the name for that
account on Ethereum. If the ENS resolver on Ethereum mainnet returns an address
for the name, that address should be considered to be valid on Ethereum
mainnet. Resolving an ENS name on another network should use that network's
record; if the name has none, it doesn't resolve on that network, and its
Ethereum mainnet record should not be reported as an address on that
network[^7]. All name resolution requests should thus
return an `AddressOnNetwork`, as above, that corresponds to the network the
address's name was resolved on.

Once that name percolates into the UI, the UI should use control compatibility
to determine whether to display it in a given context. For example, a keyring
account's name should be present no matter what network the user is viewing. A
read-only account's name, on the other hand, should only display on the
network it was saved on; elsewhere, the UI should fall back to any name saved
for the network being viewed. Whether names are copied to compatible
networks on save or looked up across networks on display is _to be determined
during implementation_.

Similarly, when entering a recipient address in the Send page, the name should
only be considered resolved if a resolved name is returned that is
control-compatible to the requested network. If the name doesn't resolve on
the network being sent on, the UI may fall back to resolving it on Ethereum
mainnet; that address is then only considered resolved if it's
control-compatible with the network being sent on. If it isn't known to be,
the UI should give the user warning feedback that the address is known (and
allow the name to be used) but not guaranteed to be controlled by the same
person. The specifics are left to the design team.

Note that the generalized problem of displaying accounts that the user controls
on one network but not another in the Taho UI is not solved, and is a separate
issue for Taho's design team to tackle. This includes the current behavior of
adding every account to each network the user switches to, regardless of
control compatibility.

## Related Links

- [Wintermute Optimism hack announcement](https://plaid-cement-e44.notion.site/A-Message-to-the-Community-from-the-Optimism-Foundation-f49b913bb0974d8a854a8bdd409a9dd6)
- [ENSIP-11: EVM compatible chain address resolution][ensip11]
- [ENSIP-19: Multichain primary names][ensip19]
- [PR 2577: RSK Ledger integration](https://github.com/tahowallet/extension/pull/2577)

[ensip11]: https://docs.ens.domains/ensip/11
[ensip19]: https://docs.ens.domains/ensip/19
