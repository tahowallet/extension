import {
  ERC20_FUNCTIONS,
  ERC20_INTERFACE,
} from "@tallyho/tally-background/lib/erc20"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "@tallyho/tally-background/lib/fixed-point"
import { isMaxUint256 } from "@tallyho/tally-background/lib/utils"
import { updateTransactionData } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { AssetApproval } from "@tallyho/tally-background/services/enrichment"
import { ethers } from "ethers"
import { hexlify } from "ethers/lib/utils"
import React, { ReactElement, useState } from "react"
import { useDispatch } from "react-redux"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import { INTERNAL_PROVIDER_DOMAIN_NAME } from "@tallyho/tally-background/constants"
import FeeSettingsText from "../NetworkFees/FeeSettingsText"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedTooltip from "../Shared/SharedTooltip"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionInfoBaseProvider"
import SharedAddress from "../Shared/SharedAddress"

export default function SignTransactionSpendAssetInfoProvider({
  transactionDetails,
  annotation,
  inner,
}: SignTransactionInfoProviderProps<AssetApproval>): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "signTransaction.spendAsset",
  })

  const { t: sharedT } = useTranslation("translation", { keyPrefix: "shared" })
  const dispatch = useDispatch()
  const {
    assetAmount: { asset, amount: approvalLimit },
    spender,
  } = annotation

  const isInternalProvider =
    spender.annotation.nameRecord?.resolved.nameOnNetwork.name ===
    INTERNAL_PROVIDER_DOMAIN_NAME

  // `null` means no limit
  const approvalLimitString = isMaxUint256(approvalLimit)
    ? null
    : fixedPointNumberToString({
        amount: approvalLimit,
        decimals: asset.decimals,
      })

  const approvalLimitDisplayValue = `${
    approvalLimitString ?? t("infinite")
  } ${asset.symbol.toUpperCase()}`

  const [approvalLimitInput, setApprovalLimitInput] = useState<string | null>(
    null
  )

  const [hasError, setHasError] = useState(false)

  const changing = approvalLimitInput !== null

  const handleChangeClick = () => {
    setApprovalLimitInput(approvalLimitString ?? "")
  }

  const handleCancelClick = () => {
    setApprovalLimitInput(null)
  }

  const handleSaveClick = () => {
    if (!changing) return

    if (
      approvalLimitInput === "" ||
      approvalLimitInput === approvalLimitString
    ) {
      return
    }

    const decimalAmount = parseToFixedPointNumber(approvalLimitInput)

    if (
      decimalAmount === undefined ||
      (decimalAmount !== null && decimalAmount.amount < 0n)
    ) {
      setHasError(true)
      return
    }

    const bigintAmount =
      decimalAmount === null
        ? ethers.constants.MaxUint256.toBigInt()
        : convertFixedPointNumber(decimalAmount, asset.decimals).amount

    setApprovalLimitInput(null)

    const updatedInput = ERC20_INTERFACE.encodeFunctionData(
      ERC20_FUNCTIONS.approve,
      [spender.address, hexlify(bigintAmount)]
    )
    dispatch(
      updateTransactionData({
        ...transactionDetails,
        input: updatedInput,
      })
    )
  }

  return (
    <SignTransactionBaseInfoProvider
      title="Approve asset spend"
      confirmButtonLabel={t("approve")}
      infoBlock={
        <>
          <div className="spend_destination_icons">
            <div className="site_icon" />
            <div className="asset_icon_wrap">
              <SharedAssetIcon
                size="large"
                symbol={asset.symbol}
                logoURL={asset.metadata?.logoURL}
              />
            </div>
          </div>
          <span className="site">
            {t("approve")}{" "}
            <SharedAddress
              address={spender.address}
              name={spender.annotation.nameRecord?.resolved.nameOnNetwork.name}
            />
          </span>
          <span className="spending_label">
            <SharedSkeletonLoader
              isLoaded={!!asset.symbol}
              customStyles="margin: 10px 0 0;"
              height={32}
            >
              {t("spend")}{" "}
              {asset.symbol ?? (
                <SharedAddress address={transactionDetails.to ?? ""} />
              )}{" "}
              {t("tokens")}
            </SharedSkeletonLoader>
          </span>
          <form onSubmit={(event) => event.preventDefault()}>
            <div className="spend_limit_header">
              <span className="spend_limit_label">{t("spendLimit")}</span>
              <SharedTooltip width={250}>
                <p className="spend_limit_tooltip">{t("tooltip1")}</p>
                <p className="spend_limit_tooltip">{t("tooltip2")}</p>
              </SharedTooltip>
            </div>
            {changing ? (
              <div>
                <SharedInput
                  label=""
                  value={approvalLimitInput}
                  placeholder={approvalLimitString ?? ""}
                  onChange={(value) => {
                    setApprovalLimitInput(value)
                    setHasError(false)
                  }}
                  errorMessage={hasError ? t("invalidAmount") : undefined}
                  autoSelect
                />
                <div
                  className={classNames("change_limit_actions", {
                    has_error: hasError,
                  })}
                >
                  <SharedButton
                    size="small"
                    type="tertiary"
                    onClick={handleCancelClick}
                  >
                    {sharedT("cancelBtn")}
                  </SharedButton>
                  <SharedButton
                    size="small"
                    isFormSubmit
                    type="tertiary"
                    onClick={handleSaveClick}
                    isDisabled={
                      approvalLimitInput === "" ||
                      approvalLimitInput === approvalLimitString
                    }
                  >
                    {sharedT("saveBtn")}
                  </SharedButton>
                </div>
              </div>
            ) : (
              <>
                <span
                  className={classNames("spend_amount", {
                    has_error: approvalLimitString === null,
                  })}
                >
                  {approvalLimitDisplayValue}
                </span>
                <SharedButton
                  size="small"
                  isFormSubmit
                  type="tertiary"
                  onClick={handleChangeClick}
                >
                  {t("changeLimit")}
                </SharedButton>
              </>
            )}
          </form>
          <div className="spacer" />
          <style jsx>
            {`
              .site_icon {
                background: url("./images/${isInternalProvider
                  ? "0x_dApp_favicon.svg"
                  : "dapp_favicon_default@2x.png"}");
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
              .spend_limit_header {
                display: flex;
                justify-content: center;
              }
              .spend_limit_label {
                color: var(--green-40);
                font-size: 14px;
                line-height: 16px;
                margin-bottom: 4px;
              }
              .spend_limit_tooltip {
                margin: 0 0 5px;
              }
              .spend_limit_tooltip:last-child {
                margin-bottom: 0;
              }
              .change_limit_actions {
                display: flex;
                justify-content: space-between;
              }
              .change_limit_actions.has_error {
                margin-top: 24px;
              }
              .spend_amount {
                color: #fff;
                font-size: 16px;
                line-height: 24px;
              }
              .spend_amount.has_error {
                color: var(--error);
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
              <SharedSkeletonLoader height={24} isLoaded={!!asset.symbol}>
                approvalLimitDisplayValue
              </SharedSkeletonLoader>
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
