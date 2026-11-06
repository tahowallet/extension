import React, { ReactElement, useState } from "react"
import { useHistory } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  selectBitcoinMainCurrencyPrice,
  selectSparkAccounts,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectInternalSignerStatus } from "@tallyho/tally-background/redux-slices/selectors/internalSignerSelectors"
import {
  addSparkAccount,
  SparkResult,
} from "@tallyho/tally-background/redux-slices/spark"
import type { SparkAccount } from "@tallyho/tally-background/services/spark/types"
import type { SparkNetworkType } from "@tallyho/tally-background/networks"
import { RootState } from "@tallyho/tally-background/redux-slices"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
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
 * accounts with their balances and offers adding one.
 */
export default function SparkOverviewSection(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const history = useHistory()
  const dispatch = useBackgroundDispatch()
  const accounts = useBackgroundSelector(selectSparkAccounts)
  const btcPrice = useBackgroundSelector(selectBitcoinMainCurrencyPrice)
  const signerStatus = useBackgroundSelector(selectInternalSignerStatus)
  const hasKeyring = useBackgroundSelector(
    (state: RootState) => state.internalSigner.keyrings.length > 0,
  )
  const [networkType, setNetworkType] = useState<SparkNetworkType>("MAINNET")
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const add = async () => {
    if (signerStatus !== "unlocked") {
      history.push("/internal-signer/unlock")
      return
    }
    setIsAdding(true)
    setError(undefined)
    const result = (await dispatch(
      addSparkAccount({ networkType }),
    )) as unknown as SparkResult<SparkAccount>
    setIsAdding(false)
    if (result.ok) {
      history.push("/spark/account", { accountID: result.value.id })
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="spark_section" data-testid="spark-overview">
      <header>
        <span>
          {t("title")} ({accounts.length})
        </span>
      </header>
      {accounts.map((account) => (
        <SparkAccountRow
          key={account.id}
          account={account}
          btcPrice={btcPrice}
        />
      ))}
      {accounts.length === 0 && <p className="empty">{t("empty")}</p>}
      <div className="add_row">
        <select
          aria-label={t("network")}
          value={networkType}
          onChange={(event) =>
            setNetworkType(event.target.value as SparkNetworkType)
          }
        >
          <option value="MAINNET">{t("mainnet")}</option>
          <option value="REGTEST">{t("regtest")}</option>
        </select>
        <SharedButton
          type="secondary"
          size="small"
          iconSmall="add"
          onClick={add}
          isLoading={isAdding}
          isDisabled={signerStatus === "unlocked" && !hasKeyring}
        >
          {t("addAccount")}
        </SharedButton>
      </div>
      {signerStatus === "unlocked" && !hasKeyring && (
        <p className="hint">{t("needsRecoveryPhrase")}</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
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
        .add_row {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
        }
        select {
          background: var(--green-95);
          color: var(--green-20);
          border: 1px solid var(--green-60);
          border-radius: 4px;
          padding: 4px 8px;
        }
        .empty,
        .hint {
          color: var(--green-40);
          font-size: 14px;
          margin: 0;
        }
        .error {
          color: var(--error);
          font-size: 14px;
          margin: 0;
          overflow-wrap: anywhere;
        }
      `}</style>
    </section>
  )
}
