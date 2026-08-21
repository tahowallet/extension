import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import dayjs from "dayjs"
import { selectCurrentAccountBalanceRetrievedAt } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector } from "../../hooks"

/**
 * When the balances on screen were last read from the chain.
 *
 * Its own component, and mounted only while the network is unreachable,
 * because that is the only time this is worth saying — and because the
 * selector behind it walks the account's balances, which change on every
 * poll, so subscribing to it the rest of the time would be recomputing an
 * answer nobody reads on every block.
 */
export default function BalanceLastUpdated(): ReactElement | null {
  const { t } = useTranslation("translation", {
    keyPrefix: "networkUnreachable",
  })
  const retrievedAt = useBackgroundSelector(
    selectCurrentAccountBalanceRetrievedAt,
  )

  if (retrievedAt === undefined) {
    return null
  }

  return (
    <div className="balance_stale">
      {t("lastUpdated", {
        time: dayjs(retrievedAt).format("MMM D, h:mm A"),
      })}
      <style jsx>{`
        .balance_stale {
          color: var(--green-40);
          font-size: 14px;
          font-weight: 400;
          line-height: 16px;
          text-align: center;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  )
}
