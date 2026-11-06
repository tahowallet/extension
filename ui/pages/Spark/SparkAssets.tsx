import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import type {
  SparkAccount,
  SparkBalance,
} from "@tallyho/tally-background/services/spark/types"
import { sparkExplorerTokenURL } from "@tallyho/tally-background/constants/spark"
import SharedLink from "../../components/Shared/SharedLink"
import { formatBTC, formatFixedPoint } from "../../components/Spark/format"

function AssetRow({
  symbol,
  name,
  amount,
  detail,
}: {
  symbol: string
  name: string
  amount: string
  detail?: ReactElement | string
}): ReactElement {
  return (
    <li data-testid="spark-asset-row">
      <span className="icon">{symbol.slice(0, 4)}</span>
      <span className="names">
        <span className="symbol">{symbol}</span>
        <span className="name">{name}</span>
      </span>
      <span className="amounts">
        <span className="amount">{amount}</span>
        {detail && <span className="detail">{detail}</span>}
      </span>
      <style jsx>{`
        li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--green-95);
          border-radius: 8px;
        }
        .icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--green-80);
          color: var(--green-20);
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .names,
        .amounts {
          display: flex;
          flex-direction: column;
        }
        .names {
          flex: 1;
          min-width: 0;
        }
        .amounts {
          align-items: flex-end;
        }
        .symbol,
        .amount {
          color: var(--white);
          font-size: 16px;
        }
        .name,
        .detail {
          color: var(--green-40);
          font-size: 14px;
        }
      `}</style>
    </li>
  )
}

/**
 * Bitcoin and Spark token balances for a Spark account.
 */
export default function SparkAssets({
  account,
  balance,
}: {
  account: SparkAccount
  balance: SparkBalance | undefined
}): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })

  if (!balance) {
    return <p className="empty">{t("noBalanceYet")}</p>
  }

  return (
    <ul>
      <AssetRow
        symbol="BTC"
        name={account.network.baseAsset.name}
        amount={formatBTC(balance.owned)}
      />
      {balance.tokens.map((token) => (
        <AssetRow
          key={token.tokenIdentifier}
          symbol={token.ticker}
          name={token.name}
          amount={formatFixedPoint(token.owned, token.decimals)}
          detail={
            <SharedLink
              url={sparkExplorerTokenURL(
                account.network,
                token.tokenIdentifier,
              )}
              text={t("viewToken")}
            />
          }
        />
      ))}
      {balance.tokens.length === 0 && <p className="hint">{t("noTokens")}</p>}
      <style jsx>{`
        ul {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0;
          margin: 8px 0 0;
          list-style: none;
        }
        .hint {
          color: var(--green-40);
          font-size: 14px;
        }
      `}</style>
    </ul>
  )
}
