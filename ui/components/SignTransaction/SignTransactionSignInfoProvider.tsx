import { unitPricePointForPricePoint } from "@tallyho/tally-background/assets"
import { USD } from "@tallyho/tally-background/constants"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { selectAssetPricePoint } from "@tallyho/tally-background/redux-slices/assets"
import { selectCurrentAddressNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import {
  enrichAssetAmountWithDecimalValues,
  enrichAssetAmountWithMainCurrencyValues,
  heuristicDesiredDecimalsForUnitPrice,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import TransactionDetailAddressValue from "../TransactionDetail/TransactionDetailAddressValue"
import TransactionDetailContainer from "../TransactionDetail/TransactionDetailContainer"
import TransactionDetailItem from "../TransactionDetail/TransactionDetailItem"
import SignTransactionBaseInfoProvider, {
  SignTransactionInfoProviderProps,
} from "./SignTransactionInfoBaseProvider"

export default function SignTransactionSignInfoProvider({
  transactionDetails,
  inner,
}: SignTransactionInfoProviderProps): ReactElement {
  const { network } = useBackgroundSelector(selectCurrentAddressNetwork)
  const baseAssetPricePoint = useBackgroundSelector((state) =>
    selectAssetPricePoint(state.assets, network.baseAsset.symbol, USD.symbol)
  )
  const transactionAssetAmount = enrichAssetAmountWithDecimalValues(
    {
      asset: network.baseAsset,
      amount: transactionDetails.value,
    },
    heuristicDesiredDecimalsForUnitPrice(
      2,
      typeof baseAssetPricePoint !== "undefined"
        ? unitPricePointForPricePoint(baseAssetPricePoint)
        : undefined
    )
  )

  const completeTransactionAssetAmount =
    enrichAssetAmountWithMainCurrencyValues(
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
            {typeof transactionDetails.to === "undefined" ? (
              <>
                <div className="label">Send to</div>
                <div className="send_to">Contract creation</div>
              </>
            ) : (
              <>
                <div className="label">Send to</div>
                <div className="send_to">
                  {truncateAddress(transactionDetails.to)}
                </div>
              </>
            )}
          </div>
          <div className="divider" />
          <div className="container">
            <div className="spend_amount_label">Spend Amount</div>
            <div className="spend_amount">
              <div className="eth_value">
                {completeTransactionAssetAmount.localizedDecimalAmount}
              </div>
              <div className="main_currency_value">
                {completeTransactionAssetAmount.localizedMainCurrencyAmount ??
                  "-"}
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
              .send_to {
                font-size: 16px;
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
          <TransactionDetailItem
            name="Spend amount"
            value={completeTransactionAssetAmount.localizedDecimalAmount}
          />
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
