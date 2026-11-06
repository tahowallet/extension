import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import type { SparkNetwork } from "@tallyho/tally-background/networks"
import { selectSparkAccounts } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import { SparkAccountView } from "../../pages/Spark/SparkAccountPage"
import { ONBOARDING_ROOT } from "../../pages/Onboarding/Tabbed/Routes"
import { shortenSparkAddress } from "./format"

/**
 * The wallet home when a Spark network is picked in the network selector:
 * that network's Spark account, or a way to add one through onboarding.
 */
export default function SparkWalletHome({
  network,
}: {
  network: SparkNetwork
}): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const accounts = useBackgroundSelector(selectSparkAccounts).filter(
    (account) => account.network.chainID === network.chainID,
  )
  const [selectedID, setSelectedID] = useState<string | undefined>()
  const account =
    accounts.find(({ id }) => id === selectedID) ?? accounts[0] ?? undefined

  if (!account) {
    return (
      <section className="empty" data-testid="spark-wallet-empty">
        <div className="btc_mark" aria-hidden>
          ₿
        </div>
        <h2>{t("home.emptyTitle", { network: network.name })}</h2>
        <p>{t("home.emptyBody")}</p>
        <SharedButton
          type="primary"
          size="large"
          onClick={() => window.open(`${ONBOARDING_ROOT}/spark`)}
        >
          {t("home.add")}
        </SharedButton>
        <style jsx>{`
          .empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
            padding: 40px 24px;
          }
          .btc_mark {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #f7931a;
            color: #fff;
            font-size: 32px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          h2 {
            margin: 0;
            color: var(--white);
            font-size: 20px;
          }
          p {
            margin: 0;
            color: var(--green-40);
          }
        `}</style>
      </section>
    )
  }

  return (
    <div className="home" data-testid="spark-wallet-home">
      <SparkAccountView
        accountID={account.id}
        renderHeader={() =>
          accounts.length > 1 ? (
            <select
              aria-label={t("home.account")}
              value={account.id}
              onChange={(event) => setSelectedID(event.target.value)}
            >
              {accounts.map((option) => (
                <option key={option.id} value={option.id}>
                  #{option.accountNumber} {shortenSparkAddress(option.address)}
                </option>
              ))}
            </select>
          ) : (
            <span />
          )
        }
      />
      <style jsx>{`
        .home {
          padding-top: 8px;
        }
        select {
          background: var(--green-95);
          color: var(--green-20);
          border: 1px solid var(--green-60);
          border-radius: 4px;
          padding: 4px 8px;
          margin-top: 8px;
        }
      `}</style>
    </div>
  )
}
