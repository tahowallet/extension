import {
  fixedPointNumberToString,
  multiplyFixedPointNumbers,
} from "@tallyho/tally-background/lib/fixed-point"
import { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import { ethers } from "ethers"
import { sha256, toUtf8Bytes, _TypedDataEncoder } from "ethers/lib/utils"
import React, { ReactElement } from "react"
import TransactionDetailContainer from "../../../../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../../../../TransactionDetail/TransactionDetailItem"

type SignerKeyringSigningProps<T extends SignOperationType> = {
  request: T
}

export default function SignerLedgerSigning<T extends SignOperationType>({
  request,
}: SignerKeyringSigningProps<T>): ReactElement {
  if ("signingData" in request) {
    const messageHash = sha256(
      toUtf8Bytes(request.rawSigningData)
    ).toUpperCase()

    return (
      <TransactionDetailContainer>
        <TransactionDetailItem name="Sign message" value="" />
        <TransactionDetailItem name="Message hash" value={messageHash} />
      </TransactionDetailContainer>
    )
  }

  if ("typedData" in request) {
    // FIXME TypeScript has a bug here that does not allow destructuring.
    // eslint-disable-next-line prefer-destructuring
    const typedData = request.typedData

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

  const ethAmountString = fixedPointNumberToString({
    amount: request.value,
    decimals: request.network.baseAsset.decimals,
  })
  const hasData = request.input !== null && request.input !== "0x"
  const maxFeeAmountString = fixedPointNumberToString(
    multiplyFixedPointNumbers(
      {
        amount: request.maxFeePerGas,
        decimals: request.network.baseAsset.decimals,
      },
      { amount: request.gasLimit, decimals: 0 }
    )
  )

  return (
    <TransactionDetailContainer>
      <TransactionDetailItem name="Review transaction" value="" />
      {hasData ? <TransactionDetailItem name="Data present" value="" /> : <></>}
      <TransactionDetailItem name="Amount" value={`ETH ${ethAmountString}`} />
      {/* FIXME What is displayed for contract creation? */}
      <TransactionDetailItem
        name="Address"
        value={
          request.to !== undefined ? ethers.utils.getAddress(request.to) : ""
        }
      />
      <TransactionDetailItem
        name="Max fees"
        value={`ETH ${maxFeeAmountString}`}
      />
    </TransactionDetailContainer>
  )
}
