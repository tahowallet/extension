import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement, useCallback, useState } from "react"
import { SignerFrameProps } from ".."
import { useBackgroundDispatch } from "../../../../hooks"
import SignerBaseFrame from "../SignerBaseFrame"
import SignerKeyringSigning from "./SignerKeyringSigning"

export default function SignerKeyringFrame<T extends SignOperationType>({
  children,
  signActionCreator,
  rejectActionCreator,
  signingActionLabel,
}: SignerFrameProps<T>): ReactElement {
  const [isSigning, setIsSigning] = useState(false)
  const dispatch = useBackgroundDispatch()

  const handleConfirm = useCallback(() => {
    setIsSigning(true)
  }, [setIsSigning])

  if (isSigning) {
    return <SignerKeyringSigning signActionCreator={signActionCreator} />
  }

  return (
    <SignerBaseFrame
      signingActionLabel={signingActionLabel}
      onReject={() => dispatch(rejectActionCreator())}
      onConfirm={handleConfirm}
    >
      {children}
    </SignerBaseFrame>
  )
}
