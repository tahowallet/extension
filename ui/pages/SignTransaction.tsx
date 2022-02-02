import React, { ReactElement, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import {
  broadcastSignedTransaction,
  rejectTransactionSignature,
  selectIsTransactionLoaded,
  selectIsTransactionSigned,
  selectTransactionData,
  signTransaction,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { getAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../hooks"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"
import SignTransactionInfoProvider, {
  SignLocationState,
} from "../components/SignTransaction/SignTransactionInfoProvider"

export { SignType } from "../components/SignTransaction/SignTransactionInfoProvider"

export default function SignTransaction({
  location,
}: {
  location: { key: string; pathname: string; state?: SignLocationState }
}): ReactElement {
  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )
  const signedTransaction = useBackgroundSelector(
    ({ transactionConstruction }) => transactionConstruction.signedTransaction
  )

  const isTransactionSigned = useBackgroundSelector(selectIsTransactionSigned)

  const shouldBroadcastOnSign = useBackgroundSelector(
    ({ transactionConstruction }) =>
      transactionConstruction.broadcastOnSign ?? false
  )

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof transactionDetails !== "undefined") {
      return getAccountTotal(state, transactionDetails.from)
    }
    return undefined
  })

  const needsKeyrings = signerAccountTotal?.signingMethod?.type === "keyring"
  const areKeyringsUnlocked = useAreKeyringsUnlocked(needsKeyrings)
  const isWaitingForKeyrings = needsKeyrings && !areKeyringsUnlocked

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  useEffect(() => {
    if (!isWaitingForKeyrings && isTransactionSigned && isTransactionSigning) {
      if (shouldBroadcastOnSign && typeof signedTransaction !== "undefined") {
        dispatch(broadcastSignedTransaction(signedTransaction))
      }

      const assetSymbol = location.state?.assetSymbol
      // Request broadcast if not dApp...
      if (typeof assetSymbol !== "undefined") {
        history.push("/singleAsset", { symbol: assetSymbol })
      } else {
        history.goBack()
      }
    }
  }, [
    dispatch,
    history,
    isTransactionSigned,
    isTransactionSigning,
    isWaitingForKeyrings,
    location.state?.assetSymbol,
    shouldBroadcastOnSign,
    signedTransaction,
  ])

  if (isWaitingForKeyrings) {
    return <></>
  }

  if (
    typeof transactionDetails === "undefined" ||
    typeof signerAccountTotal === "undefined"
  ) {
    // TODO Some sort of unexpected state error if we end up here... Or do we
    // go back in history? That won't work for dApp popovers though.
    return <></>
  }

  const handleReject = async () => {
    await dispatch(rejectTransactionSignature())
    history.goBack()
  }
  const handleConfirm = async () => {
    if (isTransactionDataReady && transactionDetails) {
      dispatch(signTransaction(transactionDetails))
      setIsTransactionSigning(true)
    }
  }

  const isWaitingForHardware =
    signerAccountTotal?.signingMethod?.type === "ledger" && isTransactionSigning

  return (
    <SignTransactionInfoProvider location={location}>
      {({ title, infoBlock, textualInfoBlock, confirmButtonLabel }) => (
        <SignTransactionContainer
          signerAccountTotal={signerAccountTotal}
          title={title}
          isWaitingForHardware={isWaitingForHardware}
          infoBlock={isWaitingForHardware ? textualInfoBlock : infoBlock}
          confirmButtonLabel={confirmButtonLabel}
          handleConfirm={handleConfirm}
          handleReject={handleReject}
        />
      )}
    </SignTransactionInfoProvider>
  )
}
