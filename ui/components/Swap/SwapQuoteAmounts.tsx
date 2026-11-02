import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { QuoteAmounts } from "../../utils/swap"

type SwapQuoteAmountsProps = {
  amounts: QuoteAmounts
  sellSymbol: string
  buySymbol: string
}

export default function SwapQuoteAmounts({
  amounts,
  sellSymbol,
  buySymbol,
}: SwapQuoteAmountsProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "swap.quoteAmounts",
  })

  return (
    <div className="quote_amounts simple_text" data-testid="swap_quote_amounts">
      {amounts.mode === "exact-out" ? (
        <>
          <p>
            {t("receiveExact", {
              amount: amounts.buyAmount,
              symbol: buySymbol,
            })}
          </p>
          <p>
            {t("payEstimate", {
              amount: amounts.estimatedSellAmount,
              maxAmount: amounts.maxSellAmount,
              symbol: sellSymbol,
            })}
          </p>
          <p className="note">{t("refundNote", { symbol: sellSymbol })}</p>
        </>
      ) : (
        <>
          <p>
            {t("receiveEstimate", {
              amount: amounts.buyAmount,
              symbol: buySymbol,
            })}
          </p>
          <p>
            {t("minimumReceived", {
              amount: amounts.minBuyAmount,
              symbol: buySymbol,
            })}
          </p>
        </>
      )}
      <style jsx>{`
        .quote_amounts {
          font-size: 14px;
          line-height: 20px;
          color: var(--green-40);
        }
        .quote_amounts p {
          margin: 0;
        }
        .note {
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
