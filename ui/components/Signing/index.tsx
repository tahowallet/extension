import React, { ReactElement } from "react"
import { getAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import {
  SignOperation,
  SignOperationType,
} from "@tallyho/tally-background/redux-slices/signing"
import { AnyAction } from "redux"
import { useBackgroundSelector } from "../../hooks"
import SignTransactionNetworkAccountInfoTopBar from "../SignTransaction/SignTransactionNetworkAccountInfoTopBar"
import { frameComponentForSigner } from "./Signer"
import {
  resolveDataSignatureDetails,
  resolveTransactionSignatureDetails,
  resolveTypedDataSignatureDetails,
} from "./SigningData"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"

/**
 * Details regarding a signature request, resolved for a signer ahead of time
 * based on the type of signature, the account whose signature is being
 * requested, and the network on which that signature is taking place; see
 * `resolveSignatureDetails`.
 */
export type ResolvedSignatureDetails = {
  signer: AccountSigner
  signingAddress: AddressOnNetwork
  renderedSigningData: ReactElement
  signingAction: string
  signActionCreator: () => AnyAction
  rejectActionCreator: () => AnyAction
}

/**
 * The props passed to a signing frame.
 */
export type SigningFrameProps<T extends SignOperationType> =
  ResolvedSignatureDetails & {
    request: T
    signer: AccountSigner
    /**
     * A string that represents what signing this data will achieve. Some
     * signers may ignore this string, others may use it for their confirmation
     * button.
     */
    signingAction: string
    children: ReactElement
  }

/**
 * The React component type of a signing frame; all *Frame components in
 * subdirectories should conform to this signature, enforced by the
 * frameComponentForSigner lookup.
 */
export type SigningFrame<T extends SignOperationType> = (
  props: SigningFrameProps<T>
) => ReactElement

// Takes a signing request and resolves the signer that should be used to sign
// it and the details of signing data for user presentation.
function resolveSignatureDetails<T extends SignOperationType>({
  request,
  accountSigner,
}: SignOperation<T>): ResolvedSignatureDetails {
  if ("signingData" in request) {
    return resolveDataSignatureDetails({ request, accountSigner }) // defined in SigningDataMessage/index.ts
  }
  if ("typedData" in request) {
    return resolveTypedDataSignatureDetails({ request, accountSigner }) // defined in SigningDataMessage/index.ts
  }
  return resolveTransactionSignatureDetails({ request, accountSigner }) // defined in SigningDataTransaction/index.ts
}

// Signing acts as a dispatcher, so prop spreading is a good tradeoff.
// The explicit prop and component types ease the linter rule's concern around
// forwarding unintended props. Disable the rule for the rest of the file
// accordingly.
/* eslint-disable react/jsx-props-no-spreading */

type SigningProps<T extends SignOperationType> = SignOperation<T>

/**
 * The Signing component is an umbrella component that renders all
 * signing-related UI. It handles choosing the correct UI to present the data
 * being signed to the user, as well as the correct UI for the signer executing
 * the actual signature, and delegates control of the UI to the signer.
 */
export function Signing<T extends SignOperationType>(
  props: SigningProps<T>
): ReactElement {
  const signatureDetails = resolveSignatureDetails(props)
  const { signer, renderedSigningData } = signatureDetails
  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof signer !== "undefined") {
      return getAccountTotal(state, signatureDetails.signingAddress)
    }
    return undefined
  })

  if (signerAccountTotal === undefined) {
    // FIXME Return some sort of error? Throw?
    return <></>
  }

  const SigningFrameComponent = frameComponentForSigner[signer.type]

  return (
    <section>
      <SharedSkeletonLoader
        isLoaded={signerAccountTotal !== undefined}
        height={32}
        width={120}
        customStyles="margin: 15px 0 15px 220px;"
      >
        {signerAccountTotal !== undefined && (
          <SignTransactionNetworkAccountInfoTopBar
            accountTotal={signerAccountTotal}
          />
        )}
      </SharedSkeletonLoader>
      <SigningFrameComponent {...{ ...props, ...signatureDetails }}>
        {renderedSigningData}
      </SigningFrameComponent>
    </section>
  )
}
