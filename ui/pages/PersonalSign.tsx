import React, { ReactElement, useState } from "react"
import {
  getAccountTotal,
  selectCurrentAccountSigningMethod,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  rejectDataSignature,
  signData,
  selectSigningData,
  SignDataMessageType,
} from "@tallyho/tally-background/redux-slices/signing"
import { useHistory } from "react-router-dom"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSigningMethodLocked,
} from "../hooks"
import PersonalSignDetailPanel from "./PersonalSignDetailPanel"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"

const TITLE: Record<SignDataMessageType, string> = {
  [SignDataMessageType.EIP4361]: "Sign in with Ethereum",
  [SignDataMessageType.EIP191]: "Sign Message",
}

export default function PersonalSignData(): ReactElement {
  const dispatch = useBackgroundDispatch()

  const signingDataRequest = useBackgroundSelector(selectSigningData)

  const history = useHistory()

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof signingDataRequest !== "undefined") {
      return getAccountTotal(state, signingDataRequest.account)
    }
    return undefined
  })

  const signingMethod = useBackgroundSelector(selectCurrentAccountSigningMethod)

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const isLocked = useIsSigningMethodLocked(signingMethod)
  if (isLocked) return <></>

  if (
    typeof signingDataRequest === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    return <></>
  }

  const handleConfirm = () => {
    if (signingMethod === null) return
    if (signingDataRequest === undefined) return

    dispatch(signData({ request: signingDataRequest, signingMethod }))
    setIsTransactionSigning(true)
  }

  const handleReject = async () => {
    dispatch(rejectDataSignature())
    history.goBack()
  }

  return (
    <SignTransactionContainer
      signerAccountTotal={signerAccountTotal}
      confirmButtonLabel="Sign"
      handleConfirm={handleConfirm}
      handleReject={handleReject}
      title={TITLE[signingDataRequest.messageType]}
      detailPanel={<PersonalSignDetailPanel />}
      reviewPanel={<PersonalSignDetailPanel />}
      isTransactionSigning={isTransactionSigning}
      extraPanel={null}
    />
  )
}
