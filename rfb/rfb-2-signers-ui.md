# RFB 2: UI Structure for Heterogeneous Signer Support

## Background

The Tally Ho wallet has always been meant to support a few things that haven't
yet been implemented. In particular, the wallet is expected to support
potentially many different types of out-of-memory signing---from connected
hardware wallets like Ledger and Trezor, to air-gapped hardware wallets like
Keystone, to remote wallet protocols like Wallet Connect, the wallet is
eventually meant to allow arbitrary signers to sign data that can produce
outcomes on various cryptocurrency chains.

To this end, the architecture of the UI flow around signing needs to be adapted
to the variations between different signers, while still supporting a common
core of functionality across signing tasks, such as presenting enriched
versions of the data being signed (for user clarity and security) and allowing
access to underlying data and, for transactions, transaction details such as
network fees.

### Current Functionality

The initial community edition release of Tally Ho featured a single way to add
an account: via a mnemonic that created an underlying HDKeyring. A keyring is
an in-memory cryptographic base key that can derive multiple addresses and sign
for them with private key material. The community edition also supported a
single signing action, signing a transaction for submission to the Ethereum
blockchain.

In the intervening time, three areas of this have started to evolve. First, the
ability to maintain key materials outside of HDKeyrings has been added, primarily
using Ledger hardware wallets. Second, the types of signing have expanded, with
the addition of personal message and typed data signing. Finally, the ability to
sign data meant for chains other than Ethereum mainnet is on the horizon.

The current version of the signing flow has largely evolved organically from a
basic flow for single-transaction signing, with limited refactoring along the
way to retrofit support for Ledger, whose behavior is quite different from
HDKeyrings, and signing typed data, whose characteristics are similar but whose
outcome is not.

## Proposal

To allow the flow to support many different types of signers, this RFB proposes
structuring all UI signing flows into two distinct phases:

- Signature data understanding and analysis.
- Signer interaction.

The first phase is focused specifically on allowing the user to understand and
analyze the contents of the message or transaction being signed, as well as,
when applicable, the on-chain impacts of that signature. It is meant to furnish
the user with certainty that what they are signing is what they intend to sign.

The second phase is focused specifically on any signer-specific actions and UI
that must be presented. This can include anything from device management (e.g.
hardware wallet connections) to data presentation (e.g. QR code generation for
air-gapped wallet data transfer) to network interactions (e.g. WalletConnect
wallet interactions).

### Goal

Once this refactor is complete, the intent is to have a clear separation
between data understanding concerns and signer-specific concerns, and to provide
infrastructure for contributors to add support for new signer types as needed.

New signer types may need their own redux slices, their own component flows
once the user moves to sign, and even their own onboarding/connection
management flows. The outcome should allow these to live independently of each
other, and to minimize the leakage between a signer that requires one set of
functionality on a signer that does not.

### Implementation

TBD

### Limitations

This RFB deliberately does not address certain internal complexities of the
signing flow that are separate from the data-signer separation mentioned above.

#### Different Categories of Signing

When considering wallet signing, it is useful to distinguish between two different
types of signatures that can be produced:

- Signing transaction data, which is generally broadcast to the chain and causes
  state mutation on the host chain.
- Signing structured or unstructured message data, which can _feed_ transaction
  data as a separate step, or alternatively can be used for other purposes such
  as authentication or authorization.

At times, transactions can depend on message signatures. As one example,
EIP-2612 specifies a message structure whose signature authorizes the movement
of funds on behalf of a user by a specified spender. Notably, however, this is
not a guaranteed fact, and other tools like Sign In with Ethereum produce
signatures that aren't necessarily ever used for on-chain actions.

This RFB focuses specifically on the question of how to structure UI component
flow to accommodate different types of signers, but _does not_ look at how
different signature types should flow between each other.

### Proof of Concept

RBD

## Future Work (optional)

TBD

## Open Questions (optional)

TBD

## Related Links

TBD
