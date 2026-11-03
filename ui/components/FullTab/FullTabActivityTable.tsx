import React, { ReactElement, useCallback, useState } from "react"
import dayjs from "dayjs"
import { useTranslation } from "react-i18next"
import { Activity } from "@tallyho/tally-background/redux-slices/activities"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  sameEVMAddress,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch } from "../../hooks"
import useActivityViewDetails from "../../hooks/activity-hooks"
import { displayAmount } from "../../utils/amounts"
import SharedActivityIcon from "../Shared/SharedActivityIcon"
import SharedAssetIcon from "../Shared/SharedAssetIcon"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import WalletActivityDetails from "../Wallet/WalletActivityDetails"
import FullTabDialog from "./FullTabDialog"

export type NetworkActivity = {
  activity: Activity
  network: EVMNetwork
  /** The account the activity was found for. */
  address: string
}

/**
 * Merges several networks' activity into one list, newest first. Each list
 * must already be in the order the activities slice keeps it, which is the
 * order the popup shows; that order is preserved exactly, and lists are only
 * interleaved with each other. This keeps each network's activity in the same
 * order in the full-tab view as in the popup.
 *
 * Lists are interleaved by block timestamp, with pending activity at the top
 * of a list coming before any confirmed activity. Block timestamps are only
 * filled in once a transaction is enriched, so some activity may not have one
 * yet. That activity interleaves at the timestamp of the closest older
 * activity in its list that has one, or failing that the closest newer one,
 * so it stays beside its neighbors instead of falling after everything else.
 */
export function mergeNetworkActivity(
  lists: NetworkActivity[][],
): NetworkActivity[] {
  // The timestamp each entry interleaves at.
  const keyedLists = lists.map((list) => {
    // The closest timestamp at or below each entry, walking up from the
    // oldest.
    const olderTimes: (number | undefined)[] = []
    let older: number | undefined
    for (let index = list.length - 1; index >= 0; index -= 1) {
      older = list[index].activity.blockTimestamp ?? older
      olderTimes[index] = older
    }

    let newer: number | undefined
    let atTop = true
    const keys = list.map(({ activity }, index) => {
      // Pending activity heads the list it's in, so it heads the merge too.
      atTop &&= activity.blockHash === null
      newer = activity.blockTimestamp ?? newer
      return atTop
        ? Number.POSITIVE_INFINITY
        : (olderTimes[index] ?? newer ?? 0)
    })
    return { list, keys }
  })

  const merged: NetworkActivity[] = []
  const positions = keyedLists.map(() => 0)
  for (;;) {
    let next = -1
    keyedLists.forEach(({ list, keys }, index) => {
      if (positions[index] >= list.length) return
      if (
        next === -1 ||
        keys[positions[index]] > keyedLists[next].keys[positions[next]]
      ) {
        next = index
      }
    })
    if (next === -1) return merged
    merged.push(keyedLists[next].list[positions[next]])
    positions[next] += 1
  }
}

function ActivityStatus({ activity }: { activity: Activity }) {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.activities",
  })
  let status: { label: string; kind: string } | null = null
  if ("status" in activity && activity.blockHash !== null) {
    if (activity.status !== 1)
      status = { label: t("transactionFailed"), kind: "failed" }
  } else if ("status" in activity && activity.status === 0) {
    status = { label: t("transactionDropped"), kind: "dropped" }
  } else if (activity.blockHash === null) {
    status = { label: t("transactionPending"), kind: "pending" }
  }
  if (!status) return null
  return (
    <span className={`status ${status.kind}`}>
      {status.label}
      <style jsx>{`
        .status {
          margin-left: 8px;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .failed,
        .dropped {
          color: var(--error);
          background: var(--error-20);
        }
        .pending {
          color: var(--attention);
          background: var(--attention-20);
        }
      `}</style>
    </span>
  )
}

function ActivityRow({
  entry,
  showNetwork,
  onOpen,
}: {
  entry: NetworkActivity
  showNetwork: boolean
  onOpen: () => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.activities",
  })
  const { activity, network, address } = entry
  const details = useActivityViewDetails(activity, address)
  const amount =
    activity.fixedPointValue === undefined
      ? { text: details.assetValue }
      : displayAmount(activity.fixedPointValue, details.assetValue)

  const isSend =
    activity.type !== "asset-transfer" ||
    sameEVMAddress(activity.sender?.address, address)
  const counterparty = isSend
    ? `${t("transactionTo")} ${
        details.recipient.name ??
        (details.recipient.address === undefined
          ? t("contractCreation")
          : truncateAddress(details.recipient.address))
      }`
    : `${t("transactionFrom")} ${truncateAddress(activity.from)}`

  return (
    <tr onClick={onOpen} data-testid="activity_list_item">
      <td>
        <div className="type">
          <SharedActivityIcon type={details.icon} size={16} />
          <span>{details.label}</span>
          <ActivityStatus activity={activity} />
        </div>
      </td>
      <td>
        <div className="amount">
          <SharedAssetIcon
            logoURL={details.assetLogoURL}
            symbol={details.assetSymbol}
            size="small"
          />
          <span className="value" title={amount.title ?? amount.text}>
            {amount.text}
          </span>
          <span className="symbol" title={details.assetSymbol}>
            {details.assetSymbol}
          </span>
        </div>
      </td>
      <td
        className="counterparty"
        title={isSend ? details.recipient.address : activity.from}
      >
        {counterparty}
      </td>
      {showNetwork && (
        <td className="network" title={network.name}>
          <SharedNetworkIcon network={network} size={20} />
        </td>
      )}
      <td className="date">
        {activity.blockTimestamp
          ? dayjs.unix(activity.blockTimestamp).format("MMM D, YYYY · HH:mm")
          : "—"}
      </td>
      <style jsx>{`
        tr {
          cursor: pointer;
          animation: row_in 0.3s ease both;
        }
        @keyframes row_in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--green-95);
          color: var(--green-20);
          font-size: 15px;
          vertical-align: middle;
          white-space: nowrap;
          transition: background-color 0.2s ease;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:hover td {
          background: var(--green-95);
        }
        .type,
        .amount {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .type span {
          color: var(--text-strong);
          font-weight: 500;
        }
        .value {
          color: var(--text-strong);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .symbol {
          color: var(--green-40);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .counterparty {
          color: var(--green-40);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .network {
          width: 1%;
        }
        .date {
          width: 1%;
          text-align: right;
          color: var(--green-40);
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-reduced-motion: reduce) {
          tr {
            animation: none;
          }
        }
      `}</style>
    </tr>
  )
}

/**
 * Renders a list of activities as a wide table, with one row per activity
 * showing its type and status, amount, counterparty, network, and date. The
 * network column is only shown when `showNetwork` is set, which callers
 * typically do when the activity spans several networks.
 *
 * Clicking a row opens the popup's activity details for that activity in a
 * {@link FullTabDialog}. If there are no entries, `emptyMessage` is shown in
 * place of the table.
 */
export default function FullTabActivityTable({
  entries,
  showNetwork = true,
  emptyMessage,
}: {
  entries: NetworkActivity[]
  showNetwork?: boolean
  emptyMessage: string
}): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const [open, setOpen] = useState<NetworkActivity | null>(null)
  const close = useCallback(() => setOpen(null), [])

  // The popup's activity details read the selected account and network, so
  // the activity's account and network are selected before they open.
  const openDetails = async (entry: NetworkActivity) => {
    await dispatch(
      setNewSelectedAccount({ address: entry.address, network: entry.network }),
    )
    setOpen(entry)
  }

  if (entries.length === 0) {
    return (
      <p className="empty">
        {emptyMessage}
        <style jsx>{`
          .empty {
            margin: 0;
            padding: 24px;
            color: var(--green-40);
            text-align: center;
          }
        `}</style>
      </p>
    )
  }

  return (
    <>
      <table data-testid="activity_list">
        <thead>
          <tr>
            <th>{t("signing.type")}</th>
            <th>{t("overview.tableHeader.asset")}</th>
            <th />
            {showNetwork && <th />}
            <th />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <ActivityRow
              key={`${entry.network.chainID}-${entry.activity.hash}`}
              entry={entry}
              showNetwork={showNetwork}
              onOpen={() => {
                void openDetails(entry)
              }}
            />
          ))}
        </tbody>
      </table>
      <FullTabDialog
        isOpen={open !== null}
        onClose={close}
        label={t("wallet.pages.activity")}
      >
        {open && (
          <WalletActivityDetails
            activityItem={open.activity}
            activityInitiatorAddress={open.address}
          />
        )}
      </FullTabDialog>
      <style jsx>{`
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        th {
          text-align: left;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--green-40);
          padding: 8px 16px;
          border-bottom: 1px solid var(--green-80);
        }
      `}</style>
    </>
  )
}
