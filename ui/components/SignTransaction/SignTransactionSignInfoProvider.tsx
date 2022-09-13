import { unitPricePointForPricePoint } from "@tallyho/tally-background/assets"
import { USD } from "@tallyho/tally-background/constants"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  heuristicDesiredDecimalsForUnitPrice,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import SharedAddress from "../Shared/SharedAddress"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionInfoBaseProvider"

export default function SignTransactionSignInfoProvider({
  transactionDetails,
  annotation,
  inner,
}: SignTransactionInfoProviderProps): ReactElement {
  const baseAssetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(
      state.assets,
      transactionDetails.network.baseAsset.symbol,
      USD.symbol
    )
  )
  const transactionAssetAmount = enrichAssetAmountWithDecimalValues(
    {
      asset: transactionDetails.network.baseAsset,
      amount: transactionDetails.value,
    },
    heuristicDesiredDecimalsForUnitPrice(
      2,
      typeof baseAssetPricePoint !== "undefined"
        ? unitPricePointForPricePoint(baseAssetPricePoint)
        : undefined
    )
  )

  const {
    localizedDecimalAmount: ethValue,
    localizedMainCurrencyAmount: dollarValue,
  } = enrichAssetAmountWithMainCurrencyValues(
    transactionAssetAmount,
    baseAssetPricePoint,
    2
  )

  return (
    <SignTransactionBaseInfoProvider
      title="Sign Transaction"
      infoBlock={
        <div className="sign_block">
          <div className="container">
            <div className="label">Send to</div>
            <SharedAddress
              address={transactionDetails.to ?? ""}
              name={
                annotation !== undefined && "contractInfo" in annotation
                  ? annotation.contractInfo.annotation.nameOnNetwork?.name
                  : undefined
              }
            />
          </div>
          <div className="divider" />
          <div className="container">
            <div className="spend_amount_label">Spend Amount</div>
            <div className="spend_amount">
              <div className="eth_value">
                {ethValue} {transactionDetails.network.baseAsset.symbol}
              </div>
              <div className="main_currency_value">
                {dollarValue ? `$${dollarValue}` : "-"}
              </div>
            </div>
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
                text-align: center;
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
              .main_currency_value {
                color: var(--green-40);
                font-size: 16px;
                line-height: 24px;
              }
            `}
          </style>
        </div>
      }
      textualInfoBlock={
        <TransactionDetailContainer>
          <TransactionDetailItem name="Type" value="Sign" />
          <TransactionDetailItem name="Spend amount" value={ethValue} />
          <TransactionDetailItem
            name="To:"
            value={
              transactionDetails.to && (
                <TransactionDetailAddressValue
                  address={transactionDetails.to}
                />
              )
            }
          />
        </TransactionDetailContainer>
      }
      confirmButtonLabel="Sign"
      inner={inner}
    />
  )
}
