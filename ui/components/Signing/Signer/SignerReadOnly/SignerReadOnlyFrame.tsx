import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement } from "react"
import { SignerFrameProps } from ".."
import { useBackgroundDispatch } from "../../../../hooks"
import SharedButton from "../../../Shared/SharedButton"

export default function SignerReadOnlyFrame<T extends SignOperationType>({
  children,
  rejectActionCreator,
}: SignerFrameProps<T>): ReactElement {
  const dispatch = useBackgroundDispatch()

  return (
    <>
      {children}
      <footer>
        <SharedButton
          size="large"
          type="secondary"
          onClick={() => dispatch(rejectActionCreator())}
        >
          Reject
        </SharedButton>

        <span className="no-signing">Read-only accounts cannot sign</span>
      </footer>
    </>
  )
}
