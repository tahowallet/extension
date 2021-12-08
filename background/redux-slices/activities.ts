import { createEntityAdapter, createSlice, EntityState } from "@reduxjs/toolkit"
import {
  keysMap,
  adaptForUI,
  ActivityItem,
  determineActivityDecimalValue,
} from "./utils/activity-utils"
import { AnyEVMTransaction } from "../networks"

export { ActivityItem }

const activitiesAdapter = createEntityAdapter<ActivityItem>({
  selectId: (activityItem) => activityItem.hash,
  sortComparer: (a, b) => {
    if (a.blockHeight === b.blockHeight) {
      return 0
    }
    if (a.blockHeight < b.blockHeight) {
      return 1
    }
    return -1
  },
})

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(37, 41)}`
}

export type ActivitiesState = {
  [address: string]: EntityState<ActivityItem>
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
          transaction: AnyEVMTransaction
          forAccounts: string[]
        }
      }
    ) => {
      const infoRows = adaptForUI(keysMap, transaction)

      forAccounts.forEach((account) => {
        const address = account.toLowerCase()

        if (!immerState[address]) {
          immerState[address] = activitiesAdapter.getInitialState()
        }

        activitiesAdapter.upsertOne(immerState[address], {
          ...transaction,
          infoRows,
          fromTruncated: truncateAddress(transaction.from),
          toTruncated: truncateAddress(transaction.to ?? ""),
          tokenDecimalValue: determineActivityDecimalValue(transaction),
        })
      })
    },
  },
})

export const { activityEncountered } = activitiesSlice.actions
export default activitiesSlice.reducer
