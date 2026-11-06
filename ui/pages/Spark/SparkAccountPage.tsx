import React, { ReactElement, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  selectBitcoinMainCurrencyPrice,
  selectSparkAccount,
  selectSparkBalance,
  selectSparkWalletStatus,
} from "@tallyho/tally-background/redux-slices/selectors"
import { refreshSparkAccount } from "@tallyho/tally-background/redux-slices/spark"
import { sparkExplorerAddressURL } from "@tallyho/tally-background/constants/spark"
import type { RootState } from "@tallyho/tally-background/redux-slices"
import {
  useAreInternalSignersUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
  useSwitchablePanels,
} from "../../hooks"
import CorePage from "../../components/Core/CorePage"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import SharedLink from "../../components/Shared/SharedLink"
import {
  formatBTC,
  formatSats,
  satsToBTCNumber,
  shortenSparkAddress,
} from "../../components/Spark/format"
import SparkAssets from "./SparkAssets"
import SparkActivity from "./SparkActivity"
import SparkReceive from "./SparkReceive"
import SparkSend from "./SparkSend"

export default function SparkAccountPage(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const location = useLocation<{ accountID?: string } | undefined>()
  const accountID = location.state?.accountID ?? ""
  const dispatch = useBackgroundDispatch()
  const isUnlocked = useAreInternalSignersUnlocked(false)

  const account = useBackgroundSelector((state: RootState) =>
    selectSparkAccount(state, accountID),
  )
  const balance = useBackgroundSelector((state: RootState) =>
    selectSparkBalance(state, accountID),
  )
  const walletStatus = useBackgroundSelector((state: RootState) =>
    selectSparkWalletStatus(state, accountID),
  )
  const btcPrice = useBackgroundSelector(selectBitcoinMainCurrencyPrice)

  useEffect(() => {
    if (account && isUnlocked) {
      dispatch(refreshSparkAccount(account.id))
    }
  }, [account, isUnlocked, dispatch])

  const panels = useSwitchablePanels(
    account
      ? [
          {
            name: t("tabs.assets"),
            panelElement: () => (
              <SparkAssets account={account} balance={balance} />
            ),
          },
          {
            name: t("tabs.activity"),
            panelElement: () => <SparkActivity account={account} />,
          },
          {
            name: t("tabs.receive"),
            panelElement: () => <SparkReceive account={account} />,
          },
          {
            name: t("tabs.send"),
            panelElement: () => (
              <SparkSend account={account} balance={balance} />
            ),
          },
        ]
      : [{ name: "", panelElement: () => <p>{t("unknownAccount")}</p> }],
  )

  if (!account) {
    return (
      <CorePage hasTabBar>
        <SharedPageHeader backPath="/portfolio">{t("title")}</SharedPageHeader>
        {panels}
      </CorePage>
    )
  }

  const isMainnet = account.network.sparkNetworkType === "MAINNET"
  const fiat =
    balance && btcPrice !== undefined && isMainnet
      ? satsToBTCNumber(balance.owned) * btcPrice
      : undefined

  return (
    <CorePage hasTabBar>
      <div className="page">
        <SharedPageHeader withoutBackText backPath="/portfolio">
          {account.network.name} #{account.accountNumber}
        </SharedPageHeader>
        <div className="summary" data-testid="spark-balance">
          <div className="btc">
            {balance ? formatBTC(balance.owned) : "—"} <span>BTC</span>
          </div>
          {balance && (
            <div className="sub">
              {formatSats(balance.available)} {t("available")}
              {balance.incoming > 0n &&
                ` · ${formatSats(balance.incoming)} ${t("incoming")}`}
              {fiat !== undefined &&
                ` · $${fiat.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}`}
            </div>
          )}
          <div className="sub">
            <SharedLink
              url={sparkExplorerAddressURL(account.network, account.address)}
              text={`${shortenSparkAddress(account.address)} ↗`}
            />
          </div>
          {!isUnlocked && <div className="notice">{t("lockedNotice")}</div>}
          {isUnlocked && walletStatus?.status === "connecting" && (
            <div className="notice">{t("connecting")}</div>
          )}
          {isUnlocked && walletStatus?.status === "error" && (
            <div className="notice error">
              {t("connectionError")}: {walletStatus.error}
            </div>
          )}
        </div>
        {panels}
      </div>
      <style jsx>{`
        .page {
          padding: 0 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .summary {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 0;
        }
        .btc {
          font-size: 28px;
          color: var(--white);
          font-weight: 500;
        }
        .btc span {
          font-size: 16px;
          color: var(--green-40);
        }
        .sub {
          color: var(--green-40);
          font-size: 14px;
        }
        .notice {
          color: var(--attention);
          font-size: 14px;
          overflow-wrap: anywhere;
        }
        .notice.error {
          color: var(--error);
        }
      `}</style>
    </CorePage>
  )
}
