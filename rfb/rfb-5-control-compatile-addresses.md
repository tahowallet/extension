# RFB 5: Control-compatible addresses

## Background

The Taho wallet was built with the intent of supporting not only multiple
networks, but multiple networks that might be of different types (e.g.,
non-EVM). This was a core design strategy, but it's often the case that
ongoing development can deprioritize certain thinking that maintains the
underlying flexibility needed to rerpesent these differences.

Currently, the code base assumes that a given address is always controlled by
the same underlying key, keyring, or external device, even if it is on a
different network. For regular keys, in practice, this is a fair assumption: if
Bob has a key that can sign for address `0x0abc` with a derivation path of
`44'/60'/0'/0/0`, the likelihood that Bob will have a different key that can
sign for address `0x0abc` but at derivation path `44'/137'/0'/0/0` is quite
low.

This assumption falls apart when it comes to accounts that are not derived or
controlled directly by in-memory private keys, however. For example, if Bob is
viewing the Ethereum network and has a key stored on a Ledger for `0x0abc` at
`44'/60'/0'/0/0` can sign a transaction for that address, they can interact
with everything as expected--dApps, etc. If Bob switches to the Rootstock
network, on the other hand, and they control that key using a Ledger, Ledger
itself might require a different app to sign a transaction for that key on
Roostock.

This is the simplest scenario. A more complex scenario appears if the address
in question is actually a smart contract or account abstraction-based wallet.
In these cases, the controls for an address on one network may differ wildly
from those on a different network. A good example of this scenario is the
Wintermute Optimism hack, where a market maker provided the Optimism team with
an Ethereum mainnet multisig address that they did not control on the Optimism
network, and lost the funds sent to that address on Optimism[^1].

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
alongside addresses or names.

[^1]: See https://plaid-cement-e44.notion.site/A-Message-to-the-Community-from-the-Optimism-Foundation-f49b913bb0974d8a854a8bdd409a9dd6

## Proposal

This RFB focuses on codifying an approach for encoding information about an
address's known control characteristics on a given network. In particular, the
goal is for an address to have enough information carried with it that the UI
and internal services can inform the user whether an address is known to exist
and correspond to the same user on multiple networks or not.

#### Control Compatibility

To allow the above, we can introduce two concepts for any given pair of networks:

- Two networks are _transaction-compatible_ for a given external wallet if sign
  a transaction for both networks from the same key material without requiring
  any on-wallet manipulation[^2].
- An _address_ is considered _control-compatible_ across the pair of networks
  if it is known to be controllable by the same mechanism across those
  networks; that is, when the wallet knows for certain that the same user can
  sign for that address across both networks.

These are the cases where the wallet should assume an address is
control-compatible across 2 networks:

- The wallet controls private key material for the address (e.g. the address is
  derived from an internal keyring).
- The address was derived from a hardware wallet that controls private key
  material for the address AND the networks are transaction-compatible[^2].
- The address has been resolved via a name service lookup on both networks and
  the owner of the records is the same on both networks.[^3] This can change
  over time, so if we choose for the wallet to leverage this condition, it
  should monitor ownership for changes and adjust its understanding of control
  compatibility based on that information. _Most likely this is not worth
  implementing at this time._

In addition to these 3 possible paths, the 2 networks must have the same
address format; e.g., an address cannot be control-compatible between Ethereum
and Bitcoin, since the address formats are different).

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
| Ledger walllet         | Polygon | Yes                 | Tx compatible      |
| Ledger walllet         | RSK     | Yes                 | Tx compatible      |
| Ledger walllet         | BTC     | No                  | Address format     |
| WalletConnect Safe[^5] | Polygon | No                  | Tx incompatible    |
| WalletConnect Safe     | RSK     | No                  | Tx incompatible    |
| WalletConnect Safe     | BTC     | No                  | Address format     |

[^2]:
    Hardware wallets can in some cases distinguish by which app can operate
    on a network based on the derivation path or transaction structure. The code
    doesn't currently have an abstracted concept of this across hardware wallets,
    and most of the Ledger code is itself written with the assumption of using the
    Ethereum app (though [PR
    2577](https://github.com/tahowallet/extension/pull/2577) has introduced some
    distinctions at the Ledger level).

[^3]:
    Currently, the name service does not externalize ownership information for
    a resolved name/address, so functionality would need to be expanded to
    support this use case, and this condition should not be used to support
    control-compatibility until that information is available.

[^4]:
    This means the same address, i.e. the address corresponding to a given
    private key, is represented differently on this network than on Ethereum.

[^5]:
    Note that Taho doesn't currently support adding an external wallet via
    WalletConnect, but a hypothetical feature that supports this would have to
    contend with the fact that such a connection is only guaranteed to work on
    a specific network.

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
otherNetwork: Network): boolean

// Examples
signingService.isAddressControlCompatible(
  { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", network: ETHEREUM },
  BITCOIN
) // false

signingService.isAddressControlCompatible(
  { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", network: ETHEREUM },
  POLYGON
) // => true if we have a signer for it, and if the signer is transaction-compatible
  //    between Ethereum and Polygon
```

This method should return `true` if the given networked object (address or
name) is control-compatible on the specified `otherNetwork`. To check control
compatibility, the signing service should check:

- If the two networks have incompatible address formats, return `false`.
- If there is no known signer for that address, return `false`.
- If there is a known signer (internal, Ledger, or otherwise), the backing service
  for that signer should have a new implemented method, `isTransactionCompatible`,
  defined below; return the result of that method.

Additionally

#### Signer service updates

Each account with a signer has an associated service (currently,
`LedgerService` and `KeyringService`) that coordinates signing for that type of
`AccountSigner`. Signer service instances are singleton, but manage signing
across multiple underlying `AccountSigner`s of that type (e.g. multiple
keyrings).

Each signer service should add a new method that looks roughly like this:

```typescript
isTransactionCompatible(network: Network, otherNetwork: Network): boolean

// Examples
ledgerService.isTransactionCompatible(
  ETHEREUM,
  ROOTSTOCK
) // => false irrespective of the signer

keyringService.isTransactionCompatible(
  ETHEREUM,
  ROOTSTOCK
) // => true irrespective of the signer
```

Note here that the underlying `AccountSigner` is irrelevant---transaction
compatibility between networks is considered to be a property of the signer
_type_, not the specific signer. There may be cases where this could differ
signer-by-signer; if that's the case, the `AccountSigner` could be taken as a
parameter.

#### Specific case: name resolution

The initial motivation for control compatibility came from wanting to implement
address book functionality in Taho, and from wanting to extend existing
behind-the-scenes address book functionality (renaming an account added to Taho
uses a vestigial address book implementation in the `PreferencesService`). When
a user renamed an account on one network, switching networks would drop the
name of the account, because Taho only considered a name to apply to a single
network. Exploring this problem space led to the development of control
compatibility as a concept.

// TODO

## Related Links

- [Wintermute Optimism hack announcement](https://plaid-cement-e44.notion.site/A-Message-to-the-Community-from-the-Optimism-Foundation-f49b913bb0974d8a854a8bdd409a9dd6)
