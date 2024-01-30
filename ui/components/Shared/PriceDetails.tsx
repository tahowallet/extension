import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedIcon from "./SharedIcon"
import SharedTooltip from "./SharedTooltip"

function formatPriceImpact(value: number): number {
  return Math.round(value * 100) / 100
}

function getPriceImpactColor(value: number | undefined): string {
  if (value) {
    switch (true) {
      case Math.abs(value) > 5:
        return "error"
      case Math.abs(value) > 2:
        return "attention"
      default:
        return "green-40"
    }
  }
  return "green-40"
}

type PriceDetailsProps = {
  amountMainCurrency?: string
  priceImpact?: number
  mainCurrencySign: string
  isLoading: boolean
}

export default function PriceDetails(props: PriceDetailsProps): ReactElement {
  const { amountMainCurrency, priceImpact, mainCurrencySign, isLoading } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "priceDetails",
  })

  return (
    <div className="simple_text content_wrap">
      {!isLoading && amountMainCurrency === undefined ? (
        <SharedTooltip
          width={180}
          height={27}
          horizontalPosition="center"
          horizontalShift={82}
          IconComponent={() => (
            <div className="warning">
              {t("noAssetPrice")}
              <SharedIcon
                width={16}
                icon="icons/m/info.svg"
                color="var(--attention)"
                style={{ flexShrink: 0 }}
              />
            </div>
          )}
        >
          <div>
            {t("noAssetPriceTooltip.firstLine")}
            <br />
            <br />
            {t("noAssetPriceTooltip.secondLine")}
          </div>
        </SharedTooltip>
      ) : (
        <>
          {amountMainCurrency === "0.00" && "<"}
          {mainCurrencySign}
          {amountMainCurrency || "0.00"}
          {!isLoading && !!priceImpact && priceImpact > 1 && (
            <span
              data-testid="price_impact_percent"
              className="price_impact_percent"
            >
              ({formatPriceImpact(priceImpact)}%
              <SharedTooltip
                width={180}
                height={27}
                horizontalPosition="left"
                IconComponent={() => (
                  <SharedIcon
                    width={16}
                    icon="icons/m/info.svg"
                    color={`var(--${getPriceImpactColor(priceImpact)})`}
                    style={{ marginLeft: -5 }}
                  />
                )}
              >
                <div>
                  {t("priceImpactTooltip.firstLine")}
                  <br />
                  {t("priceImpactTooltip.secondLine")}
                </div>
              </SharedTooltip>
              )
            </span>
          )}
        </>
      )}
      <style jsx>{`
        .content_wrap {
          font-size: 14px;
          display: flex;
          flex-direction: row;
          justify-content: end;
          gap: 2px;
        }
        .warning {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 5px;
          color: var(--attention);
          line-height: 16px;
          text-align: right;
        }
        .price_impact_percent {
          color: var(--${getPriceImpactColor(priceImpact)});
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 2px;
        }
      `}</style>
    </div>
  )
}
