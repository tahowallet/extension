import React, { ReactElement, useState } from "react"
import {
  getAccountTotal,
  selectCurrentAccountSigner,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  rejectDataSignature,
  signData,
  selectSigningData,
} from "@tallyho/tally-background/redux-slices/signing"
import { useHistory } from "react-router-dom"
import { FeatureFlagTypes, isEnabled } from "@tallyho/tally-background/features"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { useTranslation } from "react-i18next"
import { SigningDataType } from "@tallyho/tally-background/utils/signing"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSignerLocked,
} from "../hooks"
import PersonalSignDetailPanel from "./PersonalSignDetailPanel"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"
import Signing from "../components/Signing"

const TITLE: Record<SigningDataType, string> = {
  eip4361: "Sign in with Ethereum",
  eip191: "Sign Message",
}

export default function PersonalSignData(): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const signingDataRequest = useBackgroundSelector(selectSigningData)

  const history = useHistory()

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof signingDataRequest !== "undefined") {
      return getAccountTotal(state, {
        address: signingDataRequest.account.address,
        network: currentNetwork,
      })
    }
    return undefined
  })

  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const isLocked = useIsSignerLocked(currentAccountSigner)
  if (isLocked) return <></>

  if (isEnabled(FeatureFlagTypes.USE_UPDATED_SIGNING_UI)) {
    if (currentAccountSigner === null || signingDataRequest === undefined) {
      return <></>
    }

    return (
      <Signing
        accountSigner={currentAccountSigner}
        request={signingDataRequest}
      />
    )
  }

  if (
    typeof signingDataRequest === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    return <></>
  }

  const canConfirm =
    currentAccountSigner !== ReadOnlyAccountSigner &&
    signingDataRequest !== undefined

  const handleConfirm = () => {
    if (!canConfirm) return

    dispatch(
      signData({
        request: signingDataRequest,
        accountSigner: currentAccountSigner,
      })
    )
    setIsTransactionSigning(true)
  }

  const handleReject = async () => {
    dispatch(rejectDataSignature())
    history.goBack()
  }

  return (
    <SignTransactionContainer
      signerAccountTotal={signerAccountTotal}
      confirmButtonLabel={t("signTransaction.confirmButtonLabel")}
      canConfirm={canConfirm}
      handleConfirm={handleConfirm}
      handleReject={handleReject}
      title={TITLE[signingDataRequest.messageType]}
      detailPanel={<PersonalSignDetailPanel />}
      reviewPanel={<PersonalSignDetailPanel />}
      isTransactionSigning={isTransactionSigning}
      extraPanel={null}
      isArbitraryDataSigningRequired={!!signingDataRequest.signingData}
    />
  )
}
