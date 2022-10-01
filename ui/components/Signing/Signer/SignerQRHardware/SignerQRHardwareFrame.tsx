import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement, useCallback, useState } from "react"
import { SignerFrameProps } from ".."
import { useBackgroundDispatch } from "../../../../hooks"
import SharedSlideUpMenu from "../../../Shared/SharedSlideUpMenu"
import SignerBaseFrame from "../SignerBaseFrame"
import SignerQRHardwareSigning from "./SignerQRHardwareSigning"

export default function SignerQRHardwareFrame<T extends SignOperationType>({
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

  return (
    <>
      <SignerBaseFrame
        signingActionLabel={signingActionLabel}
        onReject={() => dispatch(rejectActionCreator())}
        onConfirm={handleConfirm}
      >
        {children}
      </SignerBaseFrame>
      <SharedSlideUpMenu isOpen={isSigning} close={() => setIsSigning(false)}>
        <SignerQRHardwareSigning signActionCreator={signActionCreator} />
      </SharedSlideUpMenu>
    </>
  )
}
