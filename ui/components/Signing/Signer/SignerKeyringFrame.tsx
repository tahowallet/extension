import { React, ReactElement, useCallback, useState } from "react"
import {useBackgroundDispatch} from "../../../hooks"
import SignerBaseFrame from "./SignerBaseFrame"

function SignerKeyringSigning(props: { signActionCreator: any }) {
  return <></>
}

export default function SignerKeyringFrame({
  children,
  request,
  signActionCreator,
  rejectActionCreator,
  signingAction,
}: SigningFrameProps): ReactElement {
  const [isSigning, setIsSigning] = useState(false)
  const dispatch = useBackgroundDispatch()

  const handleConfirm = useCallback(() => {
    setIsSigning(true)
  }, [setIsSigning])

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
