import React, { ReactElement, useEffect, useState } from "react"
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
import type { SparkAccount } from "@tallyho/tally-background/services/spark/types"
import {
  useAreInternalSignersUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
  useSwitchablePanels,
} from "../../hooks"
import CorePage from "../../components/Core/CorePage"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import SharedLink from "../../components/Shared/SharedLink"
import SharedButton from "../../components/Shared/SharedButton"
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

/**
 * A Spark account's balance, assets, activity, receive and send. Rendered
 * both on its own page (from the portfolio) and as the wallet home when a
 * Spark network is selected in the network selector.
 */
export function SparkAccountView({
  accountID,
  renderHeader,
}: {
  accountID: string
  renderHeader?: (account: SparkAccount) => ReactElement
}): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
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
  const [action, setAction] = useState<"receive" | "send" | undefined>()

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
        ]
      : [{ name: "", panelElement: () => <p>{t("unknownAccount")}</p> }],
  )

  if (!account) {
    return panels
  }

  const isMainnet = account.network.sparkNetworkType === "MAINNET"
  const fiat =
    balance && btcPrice !== undefined && isMainnet
      ? satsToBTCNumber(balance.owned) * btcPrice
      : undefined

  return (
    <>
      <div className="page">
        {renderHeader?.(account)}
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
          <div className="actions">
            {(["receive", "send"] as const).map((option) => (
              <SharedButton
                key={option}
                type={action === option ? "primary" : "secondary"}
                size="small"
                iconSmall={option === "receive" ? "receive" : "send"}
                iconPosition="left"
                onClick={() =>
                  setAction((current) =>
                    current === option ? undefined : option,
                  )
                }
              >
                {t(`tabs.${option}`)}
              </SharedButton>
            ))}
          </div>
        </div>
        {action === "receive" && <SparkReceive account={account} />}
        {action === "send" && <SparkSend account={account} balance={balance} />}
        {action === undefined && panels}
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
        .actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
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
    </>
  )
}

export default function SparkAccountPage(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const location = useLocation<{ accountID?: string } | undefined>()
  const accountID = location.state?.accountID ?? ""

  return (
    <CorePage hasTabBar>
      <SparkAccountView
        accountID={accountID}
        renderHeader={(account) => (
          <SharedPageHeader withoutBackText backPath="/portfolio">
            {account.network.name} #{account.accountNumber}
          </SharedPageHeader>
        )}
      />
      {accountID === "" && (
        <SharedPageHeader backPath="/portfolio">{t("title")}</SharedPageHeader>
      )}
    </CorePage>
  )
}
