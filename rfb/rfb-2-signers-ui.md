# RFB 2: UI Structure for Heterogeneous Signer Support

## Background

The Taho wallet has always been meant to support a few things that haven't
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

Signing should present the user with a complete view of the data they are going
to sign---whether a transaction or a message---and then take them through
whatever steps the particular signer requires to complete the signature
process, allowing the user to cancel the signature at their discretion. In
certain cases, the UI may present signer-specific hints very early in the
process, as with the Ledger flow indicating whether a Ledger is connected when
the user is still reviewing the transaction.

### Current Functionality

The initial community edition release of Taho featured a single way to add
an account: via a mnemonic that created an underlying HDKeyring. A keyring is
an in-memory cryptographic base key that can derive multiple addresses and sign
for them with private key material. The community edition also supported a
single signing action, signing a transaction for submission to the Ethereum
blockchain.

In the intervening time, three areas of this flow have started to evolve.
First, the ability to maintain key materials outside of HDKeyrings has been
added, primarily using Ledger hardware wallets. Second, the types of signing
have expanded, with the addition of personal message and typed data signing.
Finally, the ability to sign data meant for chains other than Ethereum mainnet
is on the horizon.

The current version of the signing flow has evolved organically from a basic
flow for single-transaction signing by an in-memory keyring, with limited
refactoring along the way to retrofit support for Ledger, whose behavior is
quite different from keyrings, and signing typed data, whose characteristics
are similar to transaction signing but whose outcome has some notable
differences.

### Terms

A few terms are used below and are worth defining:

- **Signer**: An entity that can receive a request to sign certain data, and
  either succeed or fail to sign that data. The entity can be in-memory, or
  can be a facade over an out-of-memory interaction like an external device,
  network-connected application, or other non-local signing-capable entity.
- **Keyring**: An in-memory signer that keeps key material inside the wallet,
  and persists it in encrypted fashion.
- **Remote signer**: Used in this RFB to generally refer to a signer that is
  outside the memory space of the extension; may be remote via USB, the
  internet, or even air gap/QR code.
- **Personal message signing**: Signing of unstructured plain text messages,
  specified by [EIP-191][eip191]. Unstructured messages are prefixed by a
  special string.
- **Typed data signing**: Signing of structured data that includes type
  information, specified by [EIP-712][eip712].

## Proposal

This RFB focuses on a scalable approach to architecting the UI flow for
signing, irrespective of whether it is transaction or message data being
signed. It does not speak to the interaction between transaction and message
data, nor to the handling of multiple pending signing requests (something that
has been informally referred to as "transaction queueing"), which is treated as
an orthogonal concern (see [Limitations](#limitations)).

To allow the flow to support many different types of signers, this RFB proposes
structuring all UI signing flows into two distinct phases:

- Signature data understanding and analysis.
- Interaction with the underlying signer.

The first phase is focused specifically on allowing the user to understand and
analyze the contents of the message or transaction being signed, as well as,
when applicable, the on-chain impacts of that signature. It is meant to furnish
the user with certainty that what they are signing is what they intend to sign.

The second phase is focused specifically on any signer-specific actions and UI
that must be presented. This can include anything from device management (e.g.
hardware wallet connections) to data presentation (e.g. QR code generation for
air-gapped wallet data transfer) to network interactions (e.g. WalletConnect
wallet interactions).

As mentioned in the background section, though these phases are distinct, the
UI flow is such that we may want to provide signer-specific hints in the UI
while the user is still in the understanding/analysis phase of the flow. This
can be achieved with a clear delineation between the UI components controlled
by the signer and those controlled by the data rendering concerns.

### Goal

Once this refactor is complete, the intent is to have a clear separation
between data understanding concerns and signer-specific concerns, and to
provide infrastructure for contributors to add UI support for new signer types
as needed. The signer-specific areas of the code will need to control the frame
of the signing action (the UI around the signature data) while the user is in
the analysis phase and, once the user has initiated signing, the full UI.

New signer types may need their own redux slices, their own component flows
once the user moves to sign, and even their own onboarding/connection
management flows. The outcome of this refactor should allow these to live
independently of each other, and to minimize the leakage between the details of
signer-specific functionalities.

### Implementation

At a high level, the implementation splits the UI into several distinct
components, which are structured as follows in the UI:

```
/-Signing------------
|   common header   |
|/-SignerFrame------|
|| --------------- ||
||  signer header  ||
|| --------------- ||
||                 ||
|| /-SigningData-\ ||
||                 ||
|| --------------- ||
||  signer footer  ||
|| --------------- ||
---------------------
```

The `Signing` component is charged with resolving the appropriate
`SigningData`, which renders the UI for analysis of transaction or message
data, as well as the `SignerFrame`, which is the frame component specific to
the signer that will sign the data.

The `SignerFrame` is given complete control over the presented data except for
the shared header. The signing data UI is passed to it as child element data.
The frame must show the signing data before taking further action. Once the
user clicks an action in the frame footer (typically `Sign`, if the frame
supports it), the frame should present any additional UI that is required for
actual signing. As one example, once the user requests to sign a transaction
with a Ledger, the transaction data is rendered in a way that looks more like
what is displayed on the Ledger screen so the user can more easily compare data
on the wallet to data on the Ledger.

#### Proposed file structure

The structure of the files presented below separates the high-level signing
components from the signer components. Signer components are further separated
by the type of signer. Entry points and common components can exist at the top
level under `Signing/`, `SigningData/` and `Signer/`.

```
components/
  Signing/
    index.tsx
    SigningData/
      SigningData.tsx
      SigningDataTransaction/
        ...
      SigningDataMessage/
        ...
    Signer/
      SignerBaseFrame.tsx
      SignerReadOnly/
        SignerReadOnlyFrame.tsx
        SignerReadOnlySigning.tsx
      SignerKeyring/
        SignerKeyringFrame.tsx
        SignerKeyringSigning.tsx
      SignerLedger/
        SignerLedgerFrame.tsx
        SignerLedgerSigning.tsx
      ...
```

#### Adding a new signer

Adding a new signer in this structure involves a few parts:

- Adding any service and redux logic specific to the signer (e.g. see
  `LedgerService`, `redux-slices/ledger.ts`).
- Adding the appropriate frame and signing component flows to the `Signer/`
  subdirectory above, as illustrated in the high-level examples below.
- Adding an entry to `frameComponentForSigner` (see below) mapping the
  new signer type to its frame component.
- Adding proper routing to connect signing actions in the UI to the
  `SigningService` and signer-specific service.

These should all consist almost entirely of light routing code or
signer-specific code.

#### High-level component code

Below, the high-level code for the components at each successive level of
hierarchy is presented as a set of illustrative examples of how the code flow
should work.

`background/redux-slices/signing/index.tsx`

```typescript
type SigningRequest =
  | {
      // A separate RFB, or a refactoring for this one, could unify this with
      // SignOperation and potentially replace SigningRequest with
      // SignOperation.
      transactionRequest: TransactionRequest
      broadcastOnSign: boolean
    }
  | {
      signingOperation: AnySignOperation // SignOperation<T> cannot be used here, consider subtypes
    }
```

`Signing/index.tsx`

```typescript
/**
 * Details regarding a signature request, resolved for a signer ahead of time
 * based on the type of signature, the account whose signature is being
 * requested, and the network on which that signature is taking place; see
 * `resolveSignatureDetails`.
 */
type ResolvedSignatureDetails = {
  signer: AccountSigner
  network: EVMNetwork
  renderedSigningData: ReactElement
  signActionCreator: ActionCreatorWithoutPayload
  rejectActionCreator: ActionCreatorWithoutPayload
}

/**
 * The props passed to a signing frame.
 */
type SigningFrameProps<T extends SigningRequest> = ResolvedSignatureDetails & {
  request: T
  signer: AccountSigner
  /**
   * A string that represents what signing this data will achieve. Some signers
   * may ignore this string, others may use it for their confirmation button.
   */
  signingAction: string
  children: ReactElement
}

/**
 * The React component type of a signing frame; all *Frame components in
 * subdirectories should conform to this signature, enforced by the
 * frameComponentForSigner lookup.
 */
export type SigningFrame = (props: SigningFrameProps) => ReactElement

// Takes a signing request and resolves the signer that should be used to sign
// it and the details of signing data for user presentation.
function resolveSignatureDetails(request: SigningRequest): ResolvedSignatureDetails {
  if ("transactionRequest" in request) {
    return resolveTransactionSignatureDetails(request) // defined in SigningDataTransaction/index.ts
  } else {
    return resolveDataSignatureDetails(request) // defined in SigningDataMessage/index.ts
  }
}

// Signing acts as a dispatcher, so prop spreading is a good tradeoff.
// The explicit prop and component types ease the concern around forwarding
// unintended props. Disable the rule for the rest of the file accordingly.
// eslint-disable react/jsx-props-no-spreading

type SigningProps = SigningRequest

/**
 * The Signing component is an umbrella component that renders all
 * signing-related UI. It handles choosing the correct UI to present the data
 * being signed to the user, as well as the correct UI for the signer executing
 * the actual signature, and delegates control of the UI to the signer.
 */
export function Signing(props: SigningProps): ReactElement {
  const signatureDetails = resolveSignatureDetails(props)
  const { signer } = signatureDetails
  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof signer !== "undefined") {
      return getAccountTotal(state, signer.accountID)
    }
    return undefined
  })

  // Not shown: bail if signer account total is unresolved

  const SigningFrameComponent = frameComponentForSigner[signer] // see Signer/index.ts

  return (
    <section>
      <SignTransactionNetworkAccountInfoTopBar accountTotal={signerAccountTotal} />
      <SigningFrameComponent {...{ ...props, ...signatureDetails }}>
        {renderedSigningData}
      </SigningFrame>
    </section>
  )
}
```

`Signing/Signer/index.ts`

```typescript
/**
 * For each available signer type, the frame that will wrap the signing data
 * data and own the signing flow.
 */
export const frameComponentForSigner: {
  [signerType in SignerType]: SigningFrame
} = {
  keyring: SignerKeyringFrame,
  ledger: SignerLedgerFrame,
  // ... will error if a new SignerType is added without a corresponding frame
}
```

Below, `SignerBaseFrame` illustrates one potential way of handling common
behavior. It may make sense to have this for any signer that presents a
standard Reject/Sign starting point, and then potentially does more complex
work afterwards.

`Signing/Signer/SignerBaseFrame.ts`

```typescript
type BaseFrameProps = SigningFrameProps & {
  handleConfirm: ()=>void
}

export function SignerBaseFrame({
  children,
  signingAction,
  onConfirm,
  onReject
}: SigningFrameProps): ReactElement {
  return (
    <>
      {children}
      <footer>
        <SharedButton
          iconSize="large"
          size="large"
          type="secondary"
          onClick={onReject}
        >
          Reject
        </SharedButton>

        <SharedButton
          type="primary"
          iconSize="large"
          size="large"
          onClick={onConfirm}
          showLoadingOnClick
        >
          {signingAction}
        </SharedButton>
      <footer>
    </>
  )
}
```

The keyring flow provides the simplest example of using `SignerBaseFrame`:

`Signing/Signer/SignerKeyring/SignerKeyringFrame.ts`

```typescript
export function SignerKeyringFrame({
  children,
  request,
  signActionCreator,
  rejectActionCreator,
  signingAction,
}: SigningFrameProps): ReactElement {
  const [isSigning, setIsSigning] = useState(false)

  const handleConfirm = useCallback(() => {
    setIsSigning(true)
  })

  return (
    <>
      {isSigning ? (
        <SignerKeyringSigning signActionCreator={signActionCreator} />
      ) : (
        <></>
      )}
      <SignerBaseFrame
        signingAction={signingAction}
        onReject={() => dispatch(rejectActionCreator())}
        onConfirm={handleConfirm}
      >
        {children}
      </SignerBaseFrame>
    </>
  )
}
```

`Signing/Signer/SignerKeyring/SignerKeyringSigning.ts`

```typescript
export function SignerKeyringSigning({
  signActionCreator: ActionCreatorWithoutPayload,
}): ReactElement {
  const keyringStatus = useBackgroundSelector(selectKeyringStatus)
  const [signingInitiated, setSigningInitiated] = useState(false)

  // Initiate signing once keyring is ready.
  useEffect(() => {
    if (!signingInitiated && keyringStatus === "unlocked") {
      dispatch(signActionCreator())

      setSigningInitiated(true)
    }
  }, [keyringStatus, signingInitiated, setSigningInitiated])

  // In this construction, keyring unlocking isn't done as a route, but in line
  // in the signing frame.
  if (keyringStatus === "uninitialized") {
    return <KeyringSetPassword />
  }
  if (keyringStatus === "locked") {
    return <KeyringUnlock />
  }

  return <></>
}
```

Finally, Ledger construction would be more complex as it needs to represent
more states:

`Signing/Signer/SignerLedger/SignerLedgerFrame.ts`

```typescript
export function SignerLedgerFrame({
  children,
  request,
  signer,
  signingAction,
  signActionCreator,
  rejectActionCreator
}: SigningFrameProps): ReactElement {
  const [isSigning, setIsSigning] = useState(false)
  const ledgerState = useSigningLedgerState(signer)

  const handleConfirm = useCallback(() => {
    setIsSigning(true)
  })

  const handleReject = useCallback(() => {
    dispatch(rejectActionCreator())
  })

  // ...

  return isSigning ?
      <SignerLedgerSigning request={request} signActionCreator={signActionCreator} /> :
      <>
        <SignerLedgerConnectionStatus signer={signer} />
        {children}
        <footer>
          <SharedButton
            iconSize="large"
            size="large"
            type="secondary"
            onClick={handleReject}
          >
            Reject
          </SharedButton>

          {signingLedgerState !== "avaiable" ? (
              <SharedButton
                type="primary"
                iconSize="large"
                size="large"
                onClick={() => {
                  setSlideUpOpen(true)
                }}
              >
                Check Ledger
              </SharedButton>
            ) : (
              <SharedButton
                type="primary"
                iconSize="large"
                size="large"
                onClick={handleConfirm}
                showLoadingOnClick
              >
                {signingAction}
              </SharedButton>
            )
        <footer>
        <SharedSlideUpMenu ...>
          <SignerLedgerConnect signer={signer} />
        <SharedSlideUpMenu>
      </>
}
```

`Signing/Signer/SignerLedger/SignerLedgerSigning.ts`

```typescript
export function SignerLedgerSigning({
  request: SigningRequest,
  signActionCreator: ActionCreatorWithoutPayload
}): ReactElement {
  useEffect(() => {
    dispatch(signActionCreator())
  }, [])

  return (
    <>
      <h1 className="serif_header title">
        "Awaiting hardware wallet signature"
      </h1>
      <div className="primary_info_card standard_width">
        <SignerLedgerSigningReviewPanel request={request} >
      </div>
      <div className="cannot_reject_warning">
        <span className="block_icon" />
        Tx can only be Rejected from Ledger
      </div>
    </>
  )
}
```

#### Similarities to current approach

There are strong similarities between the proposed code above and what is
currently happening for transactions, with a few notable differences:

- The details resolver (`resolveSignatureDetails` and its delegates) is similar to the
  `SignTransactionInfoProvider`, but is deliberately oriented towards resolving data,
  and thus not structured as a component but as a plain function. Instead,
  component-related decisions are left to the signer frame.
- The `Signing` container behaves similarly to the `SignTransactionContainer`,
  but, as with the details resolver, leaves things like the review panel to the
  signer frame.
- Much of the conditional logic that handles Ledger is left entirely to the
  Ledger frame instead of being entwined with the shared transaction analysis
  logic. As a specific example, the `reviewPanel` used in the current
  transaction signing flow is left to the Ledger frame, which can render a
  review panel that closely maps to what the user will see on their Ledger.
  This panel's function is substantially different from the analysis components
  used by the user to confirm the transaction being signed _does what they
  expect_, and is instead focused on helping the user confirm that the
  transaction in the wallet is the same one they are signing on their hardware
  device.

Keychain unlocking in particular diverges somewhat from the current functioning:

- The flow of keychain unlock moves from the beginning of the signing flow
  (before transaction data is presented) to the end of it (once the user
  chooses to sign). This aligns keychain signing with what is expected to
  happen in other signers, which generally don't block on signer availability
  until the user explicitly takes signing action. It was discussed briefly [in
  GitHub](#move-keychain-unlock), and more extensively offline with the design
  team.
- Keychain unlock is moved to be directly internal to the signing flow, and
  framed by the top-level `Signing` frame (which lists the network and
  account). This shift should be checked with the design team before executing
  on it.

### Limitations

#### Different Categories of Signing

This RFB deliberately does not address certain internal complexities of the
signing flow that are separate from the data-signer separation mentioned above,
as below.

When considering wallet signing, it is useful to distinguish between two different
types of signatures that can be produced:

- Signing transaction data, which is generally broadcast to the chain and causes
  state mutation on the host chain.
- Signing structured or unstructured message data, which can _feed_ transaction
  data as a separate step, or alternatively can be used for other purposes such
  as authentication or authorization.

At times, transactions can depend on message signatures. As one example,
EIP-2612 specifies a message structure whose signature authorizes the movement
of funds on behalf of a user by a specified spender. Notably, this dependency
is not always present, and other tools like Sign In with Ethereum produce
signatures that aren't necessarily used for on-chain actions.

This RFB focuses specifically on the question of how to structure UI component
flow to accommodate different types of signers, but _does not_ look at how
different signature types should flow between each other.

## Related Links

- [EIP-191: Signed Data Standard][eip191]
- [EIP-712: Ethereum typed structured data hashing and signing][eip712]
- <a name="move-keychain-unlock"></a>[GH comment: Intent to move keychain unlock step](https://github.com/tallycash/extension/pull/899#discussion_r792667593)
- [GH comment: early structural flow suggestion](https://github.com/tallycash/extension/pull/932#pullrequestreview-873498285)

[eip712]: https://eips.ethereum.org/EIPS/eip-712
[eip191]: https://eips.ethereum.org/EIPS/eip-191
