import React, { ReactElement } from "react"
import { useHistory } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  selectBitcoinMainCurrencyPrice,
  selectSparkAccounts,
} from "@tallyho/tally-background/redux-slices/selectors"
import type { SparkAccount } from "@tallyho/tally-background/services/spark/types"
import { RootState } from "@tallyho/tally-background/redux-slices"
import { useBackgroundSelector } from "../../hooks"
import { formatBTC, satsToBTCNumber, shortenSparkAddress } from "./format"

function SparkAccountRow({
  account,
  btcPrice,
}: {
  account: SparkAccount
  btcPrice: number | undefined
}): ReactElement {
  const history = useHistory()
  const balance = useBackgroundSelector(
    (state: RootState) => state.spark.balances[account.id],
  )
  const isMainnet = account.network.sparkNetworkType === "MAINNET"
  const fiat =
    balance && btcPrice !== undefined && isMainnet
      ? satsToBTCNumber(balance.owned) * btcPrice
      : undefined

  return (
    <button
      type="button"
      className="spark_account"
      data-testid="spark-account-row"
      onClick={() => history.push("/spark/account", { accountID: account.id })}
    >
      <span className="btc_icon">₿</span>
      <span className="details">
        <span className="name">
          {account.network.name} #{account.accountNumber}
        </span>
        <span className="address">{shortenSparkAddress(account.address)}</span>
      </span>
      <span className="amounts">
        <span className="btc">
          {balance ? formatBTC(balance.owned) : "—"} BTC
        </span>
        {fiat !== undefined && (
          <span className="fiat">
            ${fiat.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </span>
        )}
      </span>
      <style jsx>{`
        .spark_account {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          background: var(--green-95);
          text-align: left;
          cursor: pointer;
        }
        .spark_account:hover {
          background: var(--green-80);
        }
        .btc_icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f7931a;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .details,
        .amounts {
          display: flex;
          flex-direction: column;
        }
        .details {
          flex: 1;
          min-width: 0;
        }
        .amounts {
          align-items: flex-end;
        }
        .name,
        .btc {
          color: var(--white);
          font-size: 16px;
        }
        .address,
        .fiat {
          color: var(--green-40);
          font-size: 14px;
        }
      `}</style>
    </button>
  )
}

/**
 * The Spark (Bitcoin layer 2) section of the portfolio overview: lists Spark
 * accounts with their balances. Accounts are added through onboarding's
 * Add wallet flow, not here. Hidden until there is a Spark account.
 */
export default function SparkOverviewSection(): ReactElement | null {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const accounts = useBackgroundSelector(selectSparkAccounts)
  const btcPrice = useBackgroundSelector(selectBitcoinMainCurrencyPrice)

  if (accounts.length === 0) {
    return null
  }

  return (
    <section className="spark_section" data-testid="spark-overview">
      <header>
        {t("title")} ({accounts.length})
      </header>
      {accounts.map((account) => (
        <SparkAccountRow
          key={account.id}
          account={account}
          btcPrice={btcPrice}
        />
      ))}
      <style jsx>{`
        .spark_section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        header {
          color: var(--green-40);
          font-size: 16px;
          font-weight: 500;
        }
      `}</style>
    </section>
  )
}
