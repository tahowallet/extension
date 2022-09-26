import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { ReactElement } from "react"
import { ResolvedSignatureDetails } from "../SignatureDetails"

/**
 * The props passed to a signer-specific frame, as well as to the dispatcher
 * component SignerFrame.
 */
export type SignerFrameProps<T extends SignOperationType> =
  ResolvedSignatureDetails & {
    request: T
    signer: AccountSigner
    /**
     * A string that represents what signing this data will achieve. Some
     * signers may ignore this string, others may use it for their confirmation
     * button.
     */
    signingActionLabel: string
    /**
     * The children a signer frame should render to present the user with
     * additional information about the data being signed.
     */
    children: ReactElement
  }
