import React, { ReactElement, useState } from "react"
import {
  rejectTransactionSignature,
  signTransaction,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  selectIsTransactionLoaded,
  selectTransactionData,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import {
  getAccountTotal,
  selectCurrentAccountSigner,
} from "@tallyho/tally-background/redux-slices/selectors"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useIsSignerLocked,
} from "../hooks"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"
import SignTransactionInfoProvider from "../components/SignTransaction/SignTransactionInfoProvider"
import SignTransactionPanelSwitcher from "../components/SignTransaction/SignTransactionPanelSwitcher"
import SignTransactionPanelCombined from "../components/SignTransaction/SignTransactionPanelCombined"
import Signing from "../components/Signing"
import SignTransactionLoader from "../components/SignTransaction/SignTransactionLoader"

export default function SignTransaction(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const isTransactionDataReady = useBackgroundSelector(
    selectIsTransactionLoaded
  )

  const signerAccountTotal = useBackgroundSelector((state) => {
    if (typeof transactionDetails !== "undefined") {
      return getAccountTotal(state, {
        address: transactionDetails.from,
        network: transactionDetails.network,
      })
    }
    return undefined
  })

  const [isTransactionSigning, setIsTransactionSigning] = useState(false)

  const accountSigner = useBackgroundSelector(selectCurrentAccountSigner)

  const isLocked = useIsSignerLocked(accountSigner)

  if (isEnabled(FeatureFlags.USE_UPDATED_SIGNING_UI)) {
    return <Signing request={transactionDetails} />
  }

  if (
    accountSigner === null ||
    accountSigner === undefined ||
    transactionDetails === undefined
  ) {
    return <SignTransactionLoader />
  }

  if (isLocked) return <></>

  const canConfirm =
    isTransactionDataReady && accountSigner !== ReadOnlyAccountSigner

  const handleReject = async () => {
    await dispatch(rejectTransactionSignature())
  }
  const handleConfirm = async () => {
    if (canConfirm) {
      dispatch(
        signTransaction({
          request: transactionDetails,
          accountSigner,
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
          canConfirm={canConfirm}
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
          warnings={transactionDetails?.annotation?.warnings}
          isTransactionSigning={isTransactionSigning}
          isArbitraryDataSigningRequired={
            !!(transactionDetails?.input ?? false)
          }
        />
      )}
    </SignTransactionInfoProvider>
  )
}
