import {
  ERC20_FUNCTIONS,
  ERC20_INTERFACE,
} from "@tallyho/tally-background/lib/erc20"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "@tallyho/tally-background/lib/fixed-point"
import {
  isMaxUint256,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import { updateTransactionOptions } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { AssetApproval } from "@tallyho/tally-background/services/enrichment"
import { ethers } from "ethers"
import { hexlify } from "ethers/lib/utils"
import React, { ReactElement, useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import FeeSettingsText from "../NetworkFees/FeeSettingsText"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionInfoBaseProvider"

export default function SignTransactionSpendAssetInfoProvider({
  transactionDetails,
  annotation,
  inner,
}: SignTransactionInfoProviderProps<AssetApproval>): ReactElement {
  const [approvalLimit, setApprovalLimit] = useState("")
  const dispatch = useDispatch()
  const {
    assetAmount: { asset, amount: approveAmount },
    spenderAddress,
  } = annotation
  const [changing, setChanging] = useState(false)

  const infiniteApproval = isMaxUint256(approveAmount ?? 0n)

  useEffect(() => {
    setApprovalLimit(
      isMaxUint256(approveAmount)
        ? "Infinite"
        : fixedPointNumberToString({
            amount: approveAmount,
            decimals: asset.decimals,
          })
    )
  }, [approveAmount, asset?.decimals])

  const handleUpdateClick = () => {
    setChanging(!changing)
    if (changing) {
      const parsedApprovalAmount = parseToFixedPointNumber(approvalLimit) ?? {
        amount: 0n,
        decimals: 0,
      }
      const assetMatchedApprovalAmount = convertFixedPointNumber(
        parsedApprovalAmount,
        asset.decimals
      )
      const approvalLimitBigInt =
        approvalLimit.match(/infinit[ey]/i) ||
        (parsedApprovalAmount.decimals === 0 &&
          isMaxUint256(parsedApprovalAmount.amount))
          ? ethers.constants.MaxUint256.toBigInt()
          : assetMatchedApprovalAmount.amount

      // This will replace any bad inputs with the parsed number that is sent
      // to the backend. Mostly useful if the approval amount was 0 and becomes
      // 0 again due to bad input, since otherwise the amount is considered
      // "unchanged".
      setApprovalLimit(fixedPointNumberToString(assetMatchedApprovalAmount))

      const updatedInput = ERC20_INTERFACE.encodeFunctionData(
        ERC20_FUNCTIONS.approve,
        [spenderAddress, hexlify(approvalLimitBigInt)]
      )
      dispatch(
        updateTransactionOptions({
          ...transactionDetails,
          input: updatedInput,
        })
      )
    }
  }

  return (
    <SignTransactionBaseInfoProvider
      title="Approve asset spend"
      confirmButtonLabel="Approve"
      infoBlock={
        <>
          <div className="spend_destination_icons">
            <div className="site_icon" />
            <div className="asset_icon_wrap">
              <SharedAssetIcon size="large" symbol={asset.symbol} />
            </div>
          </div>
          <span className="site">Smart Contract Interaction</span>
          <span className="spending_label">
            {asset.symbol ? (
              `Spend ${
                asset.symbol ?? truncateAddress(transactionDetails.to ?? "")
              } tokens`
            ) : (
              <SharedSkeletonLoader />
            )}
          </span>
          <form onSubmit={(event) => event.preventDefault()}>
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
                {infiniteApproval ? "Infinite" : approvalLimit}{" "}
                {asset?.symbol.toUpperCase()}
              </span>
            )}
            <SharedButton
              size="small"
              isFormSubmit
              type="tertiary"
              onClick={handleUpdateClick}
            >
              {changing ? "Update spend limit" : "Change limit"}
            </SharedButton>
          </form>
          <div className="spacer" />
          <style jsx>
            {`
              .site_icon {
                background: url("./images/dapp_favicon_default@2x.png");
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
                text-align: center;
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
      }
      textualInfoBlock={
        <TransactionDetailContainer
          footer={
            <TransactionDetailItem
              name="Estimated network fee"
              value={<FeeSettingsText />}
            />
          }
        >
          <TransactionDetailItem name="Type" value="Approve asset spend" />
          <TransactionDetailItem
            name="Spend limit"
            value={
              asset?.symbol ? (
                `${
                  infiniteApproval ? "Infinite" : approvalLimit
                } ${asset?.symbol.toUpperCase()}`
              ) : (
                <SharedSkeletonLoader />
              )
            }
          />
          <TransactionDetailItem
            name="Contract address"
            value={
              <TransactionDetailAddressValue
                address={transactionDetails.to ?? ""}
              />
            }
          />
          {/* TODO: Add "Interacting with" line (i.e., readable version of `transactionDetails.to`?) */}
        </TransactionDetailContainer>
      }
      inner={inner}
    />
  )
}
