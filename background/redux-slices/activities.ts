import { createEntityAdapter, createSlice, EntityState } from "@reduxjs/toolkit"
import { keysMap, adaptForUI, ActivityItem } from "./utils/activity-utils"
import { truncateAddress } from "../lib/utils"

import { assetAmountToDesiredDecimals } from "../assets"
import { EnrichedEVMTransaction } from "../services/enrichment"

export { ActivityItem }

const desiredDecimals = 2 /* TODO Make desired decimals configurable? */

const activitiesAdapter = createEntityAdapter<ActivityItem>({
  selectId: (activityItem) => activityItem.hash,
  sortComparer: (a, b) => {
    if (
      (a.blockHeight === null ||
        b.blockHeight === null ||
        a.blockHeight === b.blockHeight) &&
      a.network.name === b.network.name
    ) {
      // Sort dropped transactions after their corresponding successful ones.
      if (a.nonce === b.nonce) {
        if (a.blockHeight === null) {
          return 1
        }
        if (b.blockHeight === null) {
          return -1
        }
      }
      // Sort by nonce if a block height is missing or equal between two
      // transactions, as long as the two activities are on the same network;
      // otherwise, sort as before.
      return b.nonce - a.nonce
    }
    // null means pending or dropped, these are always sorted above everything
    // if networks don't match.
    if (a.blockHeight === null && b.blockHeight === null) {
      return 0
    }
    if (a.blockHeight === null) {
      return -1
    }
    if (b.blockHeight === null) {
      return 1
    }
    return b.blockHeight - a.blockHeight
  },
})

export type ActivitiesState = {
  [address: string]: {
    [chainId: string]: EntityState<ActivityItem>
  }
}

export const initialState: ActivitiesState = {}

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    activityEncountered: (
      immerState,
      {
        payload: { transaction, forAccounts },
      }: {
        payload: {
          transaction: EnrichedEVMTransaction
          forAccounts: string[]
        }
      }
    ) => {
      const infoRows = adaptForUI(keysMap, transaction)

      forAccounts.forEach((account) => {
        const address = account.toLowerCase()

        const activityItem = {
          ...transaction,
          infoRows,
          localizedDecimalValue: assetAmountToDesiredDecimals(
            {
              asset: transaction.asset,
              amount: transaction.value,
            },
            desiredDecimals
          ).toLocaleString("default", {
            maximumFractionDigits: desiredDecimals,
          }),
          fromTruncated: truncateAddress(transaction.from),
          toTruncated: truncateAddress(transaction.to ?? ""),
        }

        immerState[address] ??= {}

        if (
          typeof immerState[address][activityItem.network.chainID] ===
          "undefined"
        ) {
          immerState[address][activityItem.network.chainID] =
            activitiesAdapter.setOne(
              activitiesAdapter.getInitialState(),
              activityItem
            )
        } else {
          activitiesAdapter.upsertOne(
            immerState[address][activityItem.network.chainID],
            activityItem
          )
        }
      })
    },
  },
})

export const { activityEncountered } = activitiesSlice.actions
export default activitiesSlice.reducer
