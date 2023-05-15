# RFB 5: Control-compatible addresses

## Background

The Taho wallet was built with the intent of supporting not only multiple
networks, but multiple networks that might be of different types (e.g.,
non-EVM). This was a core design strategy, but it's often the case that
ongoing development can deprioritize certain thinking that maintains the
underlying flexibility needed to rerpesent these differences.

Currently, the code base assumes that a given address is always controlled by
the same underlying key, keyring, or hardware device, even if it is on a
different network. For regular keys, in practice, this is a fair assumption: if
Bob has a key that can sign for address `0x0abc` with a derivation path of
`44'/60'/0'/0/0`, the likelihood that Bob will have a different key that can
sign for address `0x0abc` but at derivation path `44'/137'/0'/0/0` is quite
low.

This assumption falls apart when it comes to accounts that are not derived or
controlled directly by in-memory private keys, however. For example, if Bob is
viewing the Ethereum network and has a key for `0x0abc` at `44'/60'/0'/0/0` can
sign a transaction for that address, they can interact with everything as
expected--dApps, etc. If Bob switches to the Rootstock network, on the other
hand, and they control that key using a Ledger, Ledger itself might require a
different app to sign a transaction for that key on Roostock.

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

To allow the above, we can introduce the concept of a _control-compatible
address_. This is an address that is known to be controllable by the same
person across multiple networks. A given address is control-compatible across
more than one network when the wallet knows for certain that the same user
can control the address across those networks.

These are the cases where the wallet should assume an address is
control-compatible across 2 networks:

- The wallet controls private key material for the address (e.g. the address is
  derived from an internal keyring).
- The address was derived from a hardware wallet that controls private key
  material for the address AND the networks are transaction-compatible[^2].
- The 2 networks have the same address format (e.g. an address cannot be
  control-compatible between Ethereum and Bitcoin, since the address formats
  are different).
- The address has been resolved via a name service lookup on both networks and
  the owner of the records is the same on both networks. [^3] This can change
  over time, so if the wallet leverages these

[^2]:
    Hardware wallets can in some cases distinguish by which app can operate
    on a network based on the derivation path or transaction structure. The code
    doesn't currently have an abstracted concept of this across hardware wallets,
    and most of the Ledger code is itself written with the assumption of using the
    Ethereum app (though [PR
    2577](https://github.com/tahowallet/extension/pull/2577) has introduced some
    distinctions at the Ledger level).

[^3]:
    Currently, the name services does not externalize ownership information
    for a resolved name/address, so functionality would need to be expanded to
    support this use case.

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
be known to be controlled by the same address on multiple networks.

## Related Links

- [Wintermute Optimism hack announcement](https://plaid-cement-e44.notion.site/A-Message-to-the-Community-from-the-Optimism-Foundation-f49b913bb0974d8a854a8bdd409a9dd6)
