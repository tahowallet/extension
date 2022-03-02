import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
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
  useAreKeyringsUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
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

  const redirect = signerAccountTotal?.accountType === AccountType.Imported
  const areKeyringsUnlocked = useAreKeyringsUnlocked(redirect)

  const currentAddressSigner = useBackgroundSelector(
    selectCurrentAccountSigningMethod
  )

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  if (
    (signerAccountTotal?.accountType === AccountType.Imported &&
      !areKeyringsUnlocked) ||
    typeof typedDataRequest === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    return <></>
  }

  const handleConfirm = () => {
    if (typedDataRequest !== undefined) {
      if (currentAddressSigner) {
        typedDataRequest.signingMethod = currentAddressSigner
        dispatch(signTypedData(typedDataRequest))
        setIsTransactionSigning(true)
      }
    }
  }

  const handleReject = async () => {
    await dispatch(rejectDataSignature())
    history.goBack()
  }

  return (
    <SignTransactionContainer
      signerAccountTotal={signerAccountTotal}
      confirmButtonLabel="Sign"
      handleConfirm={handleConfirm}
      handleReject={handleReject}
      title={`Sign ${typedDataRequest.typedData.primaryType ?? "Message"}`}
      detailPanel={<SignDataDetailPanel />}
      reviewPanel={<SignDataDetailPanel />}
      isTransactionSigning={isTransactionSigning}
      extraPanel={null}
    />
  )
}
