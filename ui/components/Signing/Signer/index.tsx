import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { ReactElement } from "react"
import { ResolvedSignatureDetails } from "../SignatureDetails"

/**
 * The props passed to a signer-specific frame, as well as to the dispatcher
 * component SignerFrame.
 */
export type SignerFrameProps<
  T extends SignOperationType,
  S extends AccountSigner = AccountSigner,
> = ResolvedSignatureDetails & {
  request: T
  signer: S
  /**
   * The children a signer frame should render to present the user with
   * additional information about the data being signed.
   */
  children: ReactElement
}
