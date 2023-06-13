import React, { ReactElement } from "react"
import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import { assertUnreachable } from "@tallyho/tally-background/lib/utils/type-guards"
import SignerInternalFrame from "./SignerInternal/SignerInternalFrame"
import SignerLedgerFrame from "./SignerLedger/SignerLedgerFrame"
import SignerReadOnlyFrame from "./SignerReadOnly/SignerReadOnlyFrame"
import { SignerFrameProps } from "."

// SignerFrame acts as a dispatcher, so prop spreading is a good tradeoff.
// The explicit prop and component types ease the linter rule's concern around
// forwarding unintended props. Disable the rule for the rest of the file
// accordingly.
/* eslint-disable react/jsx-props-no-spreading */

/**
 * A component that dispatches to the appropriate signer-specific frame for
 * the signing flow based on the signer specified in the passed props.
 */
export default function SignerFrame<T extends SignOperationType>(
  props: SignerFrameProps<T>
): ReactElement {
  const { signer } = props

  switch (signer.type) {
    case "private-key":
    case "keyring":
      return <SignerInternalFrame {...props} />
    case "ledger":
      return <SignerLedgerFrame {...props} />
    case "read-only":
      return <SignerReadOnlyFrame {...props} />
    default:
      assertUnreachable(signer)
  }
}
