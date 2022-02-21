import {
  truncateAddress,
  truncateDecimalAmount,
} from "@tallyho/tally-background/lib/utils"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import {
  getAssetsState,
  selectMainCurrencySymbol,
} from "@tallyho/tally-background/redux-slices/selectors"
import { enrichAssetAmountWithMainCurrencyValues } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { TransactionAnnotation } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import FeeSettingsText from "../NetworkFees/FeeSettingsText"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionInfoBaseProvider"

export default function SignTransactionTransferInfoProvider({
  transactionDetails,
  annotation: { assetAmount, recipientAddress },
  inner,
}: SignTransactionInfoProviderProps & {
  annotation: TransactionAnnotation & { type: "asset-transfer" }
}): ReactElement {
  const assets = useBackgroundSelector(getAssetsState)
  const mainCurrencySymbol = useBackgroundSelector(selectMainCurrencySymbol)
  const assetPricePoint = selectAssetPricePoint(
    assets,
    assetAmount.asset.symbol,
    mainCurrencySymbol
  )
  const localizedMainCurrencyAmount =
    enrichAssetAmountWithMainCurrencyValues(assetAmount, assetPricePoint, 2)
      .localizedMainCurrencyAmount ?? "-"

  return (
    <SignTransactionBaseInfoProvider
      title="Sign Transfer"
      confirmButtonLabel="Sign"
      infoBlock={
        <div className="sign_block">
          <div className="container">
            <div className="label">Send to</div>
            <div className="send_to">{truncateAddress(recipientAddress)}</div>
          </div>
          <div className="divider" />
          <div className="container">
            <span className="label">Spend Amount</span>
            <span className="spend_amount">
              {assetAmount.localizedDecimalAmount} {assetAmount.asset.symbol}
            </span>
            <span className="label">${`${localizedMainCurrencyAmount}`}</span>
          </div>

          <style jsx>
            {`
              .sign_block {
                display: flex;
                width: 100%;
                flex-direction: column;
                align-items: center;
              }
              .label {
                color: var(--green-40);
                font-size: 16px;
                line-height: 24px;
                margin-bottom: 4px;
              }
              .spend_amount {
                color: #fff;
                font-size: 28px;
                text-align: right;
                text-transform: uppercase;
              }
              .divider {
                width: 80%;
                height: 2px;
                opacity: 60%;
                background-color: var(--green-120);
              }
              .container {
                display: flex;
                margin: 20px 0;
                flex-direction: column;
                align-items: center;
              }
              .send_to {
                font-size: 16px;
              }
            `}
          </style>
        </div>
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
          <TransactionDetailItem name="Type" value="Send Asset" />
          <TransactionDetailItem
            name="Spend amount"
            value={
              <>
                {truncateDecimalAmount(assetAmount.decimalAmount, 4)}{" "}
                {assetAmount.asset.symbol}
              </>
            }
          />
          <TransactionDetailItem
            name="To:"
            value={
              <TransactionDetailAddressValue
                address={transactionDetails.to ?? "-"}
              />
            }
          />
        </TransactionDetailContainer>
      }
      inner={inner}
    />
  )
}
