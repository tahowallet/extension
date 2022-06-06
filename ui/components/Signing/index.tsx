import { getAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { ActionCreatorWithoutPayload } from "@reduxjs/toolkit"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { SigningRequest } from "@tallyho/tally-background/redux-slices/signing"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { ReactElement } from "react"
import { useBackgroundSelector } from "../../../hooks"
import SignTransactionNetworkAccountInfoTopBar from "../../SignTransaction/SignTransactionNetworkAccountInfoTopBar"

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
export type SigningFrame<T extends SigningRequest> = (
  props: SigningFrameProps<T>
) => ReactElement

// Takes a signing request and resolves the signer that should be used to sign
// it and the details of signing data for user presentation.
function resolveSignatureDetails(
  request: SigningRequest
): ResolvedSignatureDetails {
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
      <SignTransactionNetworkAccountInfoTopBar
        accountTotal={signerAccountTotal}
      />
      <SigningFrameComponent {...{ ...props, ...signatureDetails }}>
        {renderedSigningData}
      </SigningFrameComponent>
    </section>
  )
}
