import {
  fixedPointNumberToString,
  multiplyFixedPointNumbers,
} from "@tallyho/tally-background/lib/fixed-point"
import {
  EIP1559TransactionRequest,
  LegacyEVMTransactionRequest,
} from "@tallyho/tally-background/networks"
import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import { DisplayDetails } from "@tallyho/tally-background/services/ledger"
import { EIP712TypedData } from "@tallyho/tally-background/types"
import { ethers } from "ethers"
import { _TypedDataEncoder } from "ethers/lib/utils"
import React, { ReactElement } from "react"
import TransactionDetailContainer from "../../../../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../../../../TransactionDetail/TransactionDetailItem"

type SignerLedgerSigningProps<T extends SignOperationType> = {
  request: T
  isArbitraryDataSigningRequired: boolean
  displayDetails: DisplayDetails
}

function SignerLedgerSigningMessage({
  rawMessage,
  displayDetails: ledgerDisplayDetails,
}: {
  rawMessage: string
  displayDetails: DisplayDetails
}): ReactElement {
  return (
    <TransactionDetailContainer>
      <TransactionDetailItem name="Sign message" value="" />
      <TransactionDetailItem
        name="Message"
        value={`${rawMessage.substring(
          0,
          ledgerDisplayDetails.messageSigningDisplayLength
        )}…`}
      />
    </TransactionDetailContainer>
  )
}

function SignerLedgerSigningTypedData({
  typedData,
}: {
  typedData: EIP712TypedData
}): ReactElement {
  const { EIP712Domain, ...typesForSigning } = typedData.types
  const domainHash = _TypedDataEncoder
    .hashDomain(typedData.domain)
    .toUpperCase()
  const messageHash = _TypedDataEncoder
    .from(typesForSigning)
    .hash(typedData.message)
    .toUpperCase()

  return (
    <TransactionDetailContainer>
      <TransactionDetailItem name="Sign typed message" value="" />
      <TransactionDetailItem name="Domain hash" value={domainHash} />
      <TransactionDetailItem name="Message hash" value={messageHash} />
    </TransactionDetailContainer>
  )
}

function SignerLedgerSigningTransaction({
  transactionRequest,
  isArbitraryDataSigningRequired,
}: {
  transactionRequest: EIP1559TransactionRequest | LegacyEVMTransactionRequest
  isArbitraryDataSigningRequired: boolean
}): ReactElement {
  const ethAmountString = fixedPointNumberToString({
    amount: transactionRequest.value,
    decimals: transactionRequest.network.baseAsset.decimals,
  })
  const maxFeeAmountString = fixedPointNumberToString(
    multiplyFixedPointNumbers(
      {
        amount:
          "maxFeePerGas" in transactionRequest
            ? transactionRequest.maxFeePerGas
            : transactionRequest.gasPrice,
        decimals: transactionRequest.network.baseAsset.decimals,
      },
      { amount: transactionRequest.gasLimit, decimals: 0 }
    )
  )

  return (
    <>
      <TransactionDetailContainer>
        <TransactionDetailItem name="Review transaction" value="" />
        {isArbitraryDataSigningRequired ? (
          <TransactionDetailItem name="Blind signing" value="" />
        ) : (
          <></>
        )}
        <TransactionDetailItem name="Amount" value={`ETH ${ethAmountString}`} />
        <TransactionDetailItem
          name="Address"
          value={
            transactionRequest.to !== undefined
              ? ethers.utils.getAddress(transactionRequest.to)
              : "Contract"
          }
        />
        <TransactionDetailItem
          name="Max fees"
          value={`ETH ${maxFeeAmountString}`}
        />
      </TransactionDetailContainer>

      <footer className="cannot_reject_warning">
        <span className="block_icon" />
        Tx can only be Rejected from Ledger
      </footer>
      <style jsx>{`
        .cannot_reject_warning {
          position: fixed;
          display: flex;
          align-items: center;
          justify-content: center;
          bottom: 0;
          padding: 16px;
          color: var(--error);
          font-weight: 600;
          font-size: 18px;
        }
        .block_icon {
          width: 24px;
          height: 24px;
          margin: 8px;
          background: no-repeat center / cover url("./images/block_icon@2x.png");
        }
      `}</style>
    </>
  )
}

export default function SignerLedgerSigning<T extends SignOperationType>({
  request,
  isArbitraryDataSigningRequired,
  displayDetails,
}: SignerLedgerSigningProps<T>): ReactElement {
  if ("signingData" in request) {
    return (
      <SignerLedgerSigningMessage
        rawMessage={request.rawSigningData}
        displayDetails={displayDetails}
      />
    )
  }

  if ("typedData" in request) {
    return <SignerLedgerSigningTypedData typedData={request.typedData} />
  }

  return (
    <SignerLedgerSigningTransaction
      transactionRequest={request}
      isArbitraryDataSigningRequired={isArbitraryDataSigningRequired}
    />
  )
}
