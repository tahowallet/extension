import React, { useCallback, useState } from "react"
import type { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import type { GridPlusAccountSigner } from "@tallyho/tally-background/services/gridplus"
import type { SignerFrameProps } from ".."
import SignerBaseFrame from "../SignerBaseFrame"
import { t } from "i18next"
import { useBackgroundDispatch } from "../../../../hooks"
import { useHistory } from "react-router-dom"

export default function SignerGridPlusFrame<
  T extends SignOperationType,
  S extends GridPlusAccountSigner,
>({
  children,
  request,
  signer,
  signingAddress,
  signingActionLabelI18nKey,
  signActionCreator,
  rejectActionCreator,
  redirectToActivityPage,
}: SignerFrameProps<T, S>) {
  const [isSigning, setIsSigning] = useState(false)
  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const handleConfirm = () => {
    dispatch(signActionCreator()).finally(() => {
      // Redirect to activity page after submitting
      if (redirectToActivityPage) {
        history.push("/", { goTo: "activity-page" })
      }
    })
    setIsSigning(true)
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
