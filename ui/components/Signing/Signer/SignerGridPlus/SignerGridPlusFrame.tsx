import React from "react"
import type { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import type { GridPlusAccountSigner } from "@tallyho/tally-background/services/grid-plus"
import { t } from "i18next"
import { useHistory } from "react-router-dom"
import type { SignerFrameProps } from ".."
import SignerBaseFrame from "../SignerBaseFrame"
import { useBackgroundDispatch } from "../../../../hooks"

export default function SignerGridPlusFrame<
  T extends SignOperationType,
  S extends GridPlusAccountSigner,
>({
  children,
  signingActionLabelI18nKey,
  signActionCreator,
  rejectActionCreator,
  redirectToActivityPage,
}: SignerFrameProps<T, S>) {
  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const handleConfirm = () => {
    dispatch(signActionCreator()).finally(() => {
      // Redirect to activity page after submitting
      if (redirectToActivityPage) {
        history.push("/", { goTo: "activity-page" })
      }
    })
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
