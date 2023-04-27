import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { SignerFrameProps } from ".."
import { useBackgroundDispatch } from "../../../../hooks"
import SignerBaseFrame from "../SignerBaseFrame"
import SignerInternalSigning from "./SignerInternalSigning"

export default function SignerKeyringFrame<T extends SignOperationType>({
  children,
  signActionCreator,
  rejectActionCreator,
  signingActionLabelI18nKey,
}: SignerFrameProps<T>): ReactElement {
  const { t } = useTranslation()

  const [isSigning, setIsSigning] = useState(false)
  const dispatch = useBackgroundDispatch()

  const handleConfirm = useCallback(() => {
    setIsSigning(true)
  }, [setIsSigning])

  if (isSigning) {
    return <SignerInternalSigning signActionCreator={signActionCreator} />
  }

  return (
    <SignerBaseFrame
      signingActionLabel={t(signingActionLabelI18nKey)}
      onReject={() => dispatch(rejectActionCreator())}
      onConfirm={handleConfirm}
    >
      {children}
    </SignerBaseFrame>
  )
}
