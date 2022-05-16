import {
  getAccountTotal,
  selectCurrentAccountSigningMethod,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  rejectDataSignature,
  selectTypedData,
  signTypedData,
} from "@tallyho/tally-background/redux-slices/signing"
import React, { ReactElement, useState } from "react"
import { useHistory } from "react-router-dom"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSigningMethodLocked,
} from "../hooks"
import SignDataDetailPanel from "./SignDataDetailPanel"

export enum SignDataType {
  TypedData = "sign-typed-data",
}

export default function SignData(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const typedDataRequest = useBackgroundSelector(selectTypedData)

  const history = useHistory()

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof typedDataRequest !== "undefined") {
      return getAccountTotal(state, typedDataRequest.account)
    }
    return undefined
  })

  const signingMethod = useBackgroundSelector(selectCurrentAccountSigningMethod)

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const isLocked = useIsSigningMethodLocked(signingMethod)
  if (isLocked) return <></>

  const handleConfirm = () => {
    if (typedDataRequest !== undefined) {
      if (signingMethod) {
        dispatch(signTypedData({ request: typedDataRequest, signingMethod }))
        setIsTransactionSigning(true)
      }
    }

    // We need to send user to the previous page after signing data is completed
    history.goBack()
  }

  const handleReject = async () => {
    await dispatch(rejectDataSignature())
    history.goBack()
  }

  const getTitle = () => {
    if (typedDataRequest?.typedData.primaryType === "PermitAndTransferFrom") {
      return "Authorize Deposit"
    }
    return `Sign ${typedDataRequest?.typedData.primaryType ?? "Message"}`
  }

  return (
    <SignTransactionContainer
      signerAccountTotal={signerAccountTotal}
      confirmButtonLabel="Confirm"
      handleConfirm={handleConfirm}
      handleReject={handleReject}
      title={getTitle()}
      detailPanel={<SignDataDetailPanel />}
      reviewPanel={<SignDataDetailPanel />}
      isTransactionSigning={isTransactionSigning}
      extraPanel={null}
      isArbitraryDataSigningRequired={false}
    />
  )
}
