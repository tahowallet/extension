import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import type { SparkAccount } from "@tallyho/tally-background/services/spark/types"
import { selectSparkActivity } from "@tallyho/tally-background/redux-slices/selectors"
import { sparkExplorerTransferURL } from "@tallyho/tally-background/constants/spark"
import type { RootState } from "@tallyho/tally-background/redux-slices"
import { useBackgroundSelector } from "../../hooks"
import SharedLink from "../../components/Shared/SharedLink"
import { formatSats } from "../../components/Spark/format"

/**
 * Recent Spark transfers for an account, each linking to the Spark explorer.
 */
export default function SparkActivity({
  account,
}: {
  account: SparkAccount
}): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const items = useBackgroundSelector((state: RootState) =>
    selectSparkActivity(state, account.id),
  )

  if (items.length === 0) {
    return <p className="empty">{t("noActivity")}</p>
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} data-testid="spark-activity-row">
          <span className={`direction ${item.direction}`}>
            {item.direction === "incoming" ? "↓" : "↑"}
          </span>
          <span className="details">
            <span className="title">
              {t(`activity.${item.direction}`)} · {t(`kind.${item.kind}`)}
            </span>
            <span className="meta">
              {item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : t("activity.pending")}{" "}
              · {item.status.replace(/^TRANSFER_STATUS_/, "").toLowerCase()}
            </span>
          </span>
          <span className="right">
            <span className={`amount ${item.direction}`}>
              {item.direction === "incoming" ? "+" : "−"}
              {formatSats(item.amountSats)}
            </span>
            <SharedLink
              url={sparkExplorerTransferURL(account.network, item.id)}
              text={t("viewOnExplorer")}
            />
          </span>
        </li>
      ))}
      <style jsx>{`
        ul {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0;
          margin: 8px 0 0;
          list-style: none;
        }
        li {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
          background: var(--green-95);
          border-radius: 8px;
        }
        .direction {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--green-80);
        }
        .details,
        .right {
          display: flex;
          flex-direction: column;
        }
        .details {
          flex: 1;
          min-width: 0;
        }
        .right {
          align-items: flex-end;
          font-size: 14px;
        }
        .title {
          color: var(--white);
        }
        .meta {
          color: var(--green-40);
          font-size: 12px;
        }
        .amount.incoming {
          color: var(--success);
        }
        .amount.outgoing {
          color: var(--white);
        }
      `}</style>
    </ul>
  )
}
