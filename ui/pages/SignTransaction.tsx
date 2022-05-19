import React, { ReactElement, useState } from "react"
import {
  rejectTransactionSignature,
  selectIsTransactionLoaded,
  selectTransactionData,
  signTransaction,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  getAccountTotal,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSigningMethodLocked,
} from "../hooks"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"
import SignTransactionInfoProvider from "../components/SignTransaction/SignTransactionInfoProvider"
import SignTransactionPanelSwitcher from "../components/SignTransaction/SignTransactionPanelSwitcher"
import SignTransactionPanelCombined from "../components/SignTransaction/SignTransactionPanelCombined"

export default function SignTransaction(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const transactionDetails = useBackgroundSelector(selectTransactionData)
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof transactionDetails !== "undefined") {
      return getAccountTotal(state, {
        address: transactionDetails.from,
        network: currentNetwork,
      })
    }
    return undefined
  })

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const signingMethod = signerAccountTotal?.signingMethod ?? null

  const isLocked = useIsSigningMethodLocked(signingMethod)

  if (isLocked) return <></>

  const handleReject = async () => {
    await dispatch(rejectTransactionSignature())
  }
  const handleConfirm = async () => {
    if (
      isTransactionDataReady &&
      transactionDetails &&
      signingMethod !== null
    ) {
      dispatch(
        signTransaction({
          transaction: transactionDetails,
          method: signingMethod,
        })
      )
      setIsTransactionSigning(true)
    }
  }

  return (
    <SignTransactionInfoProvider>
      {({ title, infoBlock, textualInfoBlock, confirmButtonLabel }) => (
        <SignTransactionContainer
          signerAccountTotal={signerAccountTotal}
          title={title}
          confirmButtonLabel={confirmButtonLabel}
          handleConfirm={handleConfirm}
          handleReject={handleReject}
          detailPanel={infoBlock}
          reviewPanel={textualInfoBlock}
          extraPanel={
            title === "Contract interaction" ? (
              <SignTransactionPanelCombined />
            ) : (
              <SignTransactionPanelSwitcher />
            )
          }
          isTransactionSigning={isTransactionSigning}
          isArbitraryDataSigningRequired={
            !!(transactionDetails?.input ?? false)
          }
        />
      )}
    </SignTransactionInfoProvider>
  )
}
