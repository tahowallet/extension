import { ReactElement } from "react"
import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { ResolvedSignatureDetails } from "./SigningData"

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
