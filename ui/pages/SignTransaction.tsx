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
import { parseERC20Tx } from "@tallyho/tally-background/lib/erc20"
import SignTransactionSwapAssetBlock from "../components/SignTransaction/SignTransactionSwapAssetBlock"
import SignTransactionSignBlock from "../components/SignTransaction/SignTransactionSignBlock"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../hooks"
import SignTransactionTransferBlock from "../components/SignTransaction/SignTransactionTransferBlock"
import SignTransactionContainer from "../components/SignTransaction/SignTransactionContainer"
import SignTransactionApproveSpendAssetBlock from "../components/SignTransaction/SignTransactionApproveSpendAssetBlock"
import { useSigningLedgerState } from "../components/SignTransaction/useSigningLedgerState"

export enum SignType {
  Sign = "sign",
  SignSwap = "sign-swap",
  SignSpend = "sign-spend",
  SignTransfer = "sign-transfer",
}

interface SignLocationState {
  assetSymbol: string
  amount: number
  signType: SignType
  to: string
  value: string | number
}

export default function SignTransaction({
  location,
}: {
  location: { key?: string; pathname: string; state?: SignLocationState }
}): ReactElement {
  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const parsedTx = parseERC20Tx(transactionDetails?.input ?? "")
  const isApproveTx = parsedTx?.name === "approve"

  const getSignType = () => {
    if (isApproveTx) {
      return SignType.SignSpend
    }
    return SignType.Sign
  }

  const { assetSymbol, amount, to, value, signType } = location?.state ?? {
    signType: getSignType(),
  }
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

      // Request broadcast if not dApp...
      if (typeof assetSymbol !== "undefined") {
        history.push("/singleAsset", { symbol: assetSymbol })
      } else {
        history.goBack()
      }
    }
  }, [
    isWaitingForKeyrings,
    isTransactionSigned,
    isTransactionSigning,
    history,
    assetSymbol,
    shouldBroadcastOnSign,
    signedTransaction,
    dispatch,
  ])

  const isLedgerSigning = signerAccountTotal?.signingMethod?.type === "ledger"

  const signingLedgerState = useSigningLedgerState(
    signerAccountTotal?.signingMethod ?? null
  )

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

  const isWaitingForHardware = isLedgerSigning && isTransactionSigning

  switch (signType) {
    case SignType.SignSwap:
      return (
        <SignTransactionContainer
          signerAccountTotal={signerAccountTotal}
          title="Swap assets"
          signingLedgerState={signingLedgerState}
          isWaitingForHardware={isWaitingForHardware}
          infoBlock={<SignTransactionSwapAssetBlock />}
          confirmButtonLabel="Confirm"
          handleConfirm={handleConfirm}
          handleReject={handleReject}
        />
      )
    case SignType.SignSpend:
      return (
        <SignTransactionContainer
          signerAccountTotal={signerAccountTotal}
          title="Approve asset spend"
          signingLedgerState={signingLedgerState}
          isWaitingForHardware={isWaitingForHardware}
          infoBlock={
            <SignTransactionApproveSpendAssetBlock
              transactionDetails={transactionDetails}
              parsedTx={parsedTx}
            />
          }
          confirmButtonLabel="Approve"
          handleConfirm={handleConfirm}
          handleReject={handleReject}
        />
      )
    case SignType.SignTransfer:
      return (
        <SignTransactionContainer
          signerAccountTotal={signerAccountTotal}
          title="Sign Transfer"
          signingLedgerState={signingLedgerState}
          isWaitingForHardware={isWaitingForHardware}
          infoBlock={
            <SignTransactionTransferBlock
              token={assetSymbol ?? ""}
              amount={amount ?? 0}
              destination={to ?? ""}
              localizedValue={value ?? ""}
            />
          }
          confirmButtonLabel="Sign"
          handleConfirm={handleConfirm}
          handleReject={handleReject}
        />
      )
    case SignType.Sign:
      return (
        <SignTransactionContainer
          signerAccountTotal={signerAccountTotal}
          title="Sign Transaction"
          signingLedgerState={signingLedgerState}
          isWaitingForHardware={isWaitingForHardware}
          infoBlock={
            <SignTransactionSignBlock transactionDetails={transactionDetails} />
          }
          confirmButtonLabel="Sign"
          handleConfirm={handleConfirm}
          handleReject={handleReject}
        />
      )
    default:
      return <></>
  }
}
