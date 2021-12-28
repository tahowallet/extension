import { EIP1559TransactionRequest } from "@tallyho/tally-background/networks"
import { selectCurrentAccountBalances } from "@tallyho/tally-background/redux-slices/selectors"
import { updateTransactionOptions } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { ethers } from "ethers"
import React, { ReactElement, useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { useBackgroundSelector } from "../../hooks"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"

interface Props {
  transactionDetails: EIP1559TransactionRequest
}

export default function SignTransactionApproveSpendAssetBlock({
  transactionDetails,
}: Props): ReactElement {
  const [approvalLimit, setApprovalLimit] = useState("")
  const dispatch = useDispatch()
  const [changing, setChanging] = useState(false)
  const accountData = useBackgroundSelector(selectCurrentAccountBalances)

  const { assetAmounts } = accountData ?? {
    assetAmounts: [],
  }

  // ERC-20 the approval amount will be in the range of 74-138 in form of a 32 bytes hex string
  const approveAmount = transactionDetails?.input?.substring(74, 138)
  const infiniteApproval =
    approveAmount ===
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

  const asset = assetAmounts.find((el) =>
    "contractAddress" in el.asset
      ? el.asset.contractAddress === transactionDetails.to
      : undefined
  )

  const getNumericStringValueFromHex = (hexString: string | undefined) => {
    let hexValue = hexString
    if (hexValue && !hexString?.includes("x")) {
      hexValue = `0x${hexString}`
    }
    return Number(hexValue).toString()
  }

  useEffect(() => {
    setApprovalLimit(getNumericStringValueFromHex(approveAmount) ?? "0")
  }, [approveAmount])

  const handleUpdateClick = () => {
    setChanging(!changing)
    if (changing && transactionDetails) {
      const updatedInput = `${transactionDetails.input?.substring(0, 74)}${
        ethers.utils
          .hexZeroPad(ethers.utils.hexlify(Number(approvalLimit)), 32)
          .split("0x")[1]
      }`
      const newTxDetails = { ...transactionDetails }
      newTxDetails.input = updatedInput
      dispatch(updateTransactionOptions(newTxDetails))
    }
  }
  return (
    <>
      <div className="spend_destination_icons">
        <div className="site_icon" />
        <div className="asset_icon_wrap">
          <SharedAssetIcon size="large" />
        </div>
      </div>
      <span className="site">Uniswap</span>
      <span className="spending_label">{`Spend ${asset?.asset.symbol} tokens`}</span>
      <span className="speed_limit_label">Spend limit</span>
      {changing ? (
        <div>
          <SharedInput
            label=""
            value={approvalLimit}
            onChange={setApprovalLimit}
          />
        </div>
      ) : (
        <span className="spend_amount">
          {`${
            infiniteApproval ? "Infinite" : approvalLimit
          } ${asset?.asset.symbol.toUpperCase()}`}
        </span>
      )}
      <SharedButton size="small" type="tertiary" onClick={handleUpdateClick}>
        {changing ? "Update spend limit" : "Change limit"}
      </SharedButton>
      <div className="spacer" />
      <style jsx>
        {`
          .site_icon {
            background: url("./images/uniswap_large@2x.png");
            background-size: cover;
            width: 48px;
            height: 48px;
            margin-right: -16px;
          }
          .spend_destination_icons {
            display: flex;
            margin-top: 22px;
            margin-bottom: 16px;
          }
          .asset_icon_wrap {
            z-index: 1;
          }
          .site {
            color: #fff;
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: center;
          }
          .spending_label {
            width: 272px;
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            text-align: center;
            border-bottom: 1px solid var(--green-120);
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .speed_limit_label {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            margin-bottom: 4px;
          }
          .spend_amount {
            color: #fff;
            font-size: 16px;
            line-height: 24px;
          }
          .spacer {
            margin-bottom: 18px;
          }
        `}
      </style>
    </>
  )
}
