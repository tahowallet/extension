import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import dayjs from "dayjs"
import { convertToEth } from "../lib/utils"
import { AnyEVMTransaction } from "../types"

const { compare } = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

export type ActivityItem = AnyEVMTransaction & {
  timestamp?: number
  value: bigint
  from?: string
  isSent?: boolean
  gas: number
  blockHeight: number
  detailRows: {
    [name: string]: {
      label: string
      value: any
      valueDetail: string
    }
  }
}

export type ActivitiesState = {
  [address: string]: ActivityItem[]
}

export const initialState: ActivitiesState = {}

type KeyRenameAndPickMap<T> = {
  [P in keyof T]?: {
    readableName: string
    transformer: (value: T[P]) => string
    detailTransformer: (value: T[P]) => string
  }
}

function renameAndPickKeys<T>(keysMap: KeyRenameAndPickMap<T>, item: T) {
  // The as below is dicey but reasonable in our usage.
  return Object.keys(item).reduce((previousValue, key) => {
    if (key in keysMap) {
      const knownKey = key as keyof KeyRenameAndPickMap<T> // guaranteed to be true by the `in` test
      const keyAdjustment = keysMap[knownKey]

      return keyAdjustment === undefined
        ? previousValue
        : {
            ...previousValue,
            [keyAdjustment.readableName]: keyAdjustment.transformer(
              item[knownKey]
            ),
          }
    }
    return previousValue
  }, {})
}

const insertActivityItemSorted = (
  activityItems: ActivityItem[],
  activityItem: ActivityItem
) => {
  let low = 0
  let high = activityItems.length

  while (low < high) {
    const mid = (low + high) / 2

    if (
      compare(
        `${activityItems[mid].blockHeight}`,
        `${activityItem.blockHeight}`
      ) > 0
    ) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  activityItems.splice(low, 0, activityItem)
}

function ethTransformer(value: string | number | bigint | null) {
  if (value === null) {
    return "(Unknown)"
  }
  return `${convertToEth(value)} ETH`
}

const keysMap: KeyRenameAndPickMap<ActivityItem> = {
  blockHeight: {
    readableName: "Block Height",
    transformer: (item: number) => item.toString(),
    detailTransformer: () => {
      return ""
    },
  },
  value: {
    readableName: "Amount",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  gas: {
    readableName: "Gas",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  maxFeePerGas: {
    readableName: "Max Fee/Gas",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  gasPrice: {
    readableName: "Gas Price",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  timestamp: {
    readableName: "Timestamp",
    transformer: (item) => {
      if (typeof item !== "undefined") {
        return dayjs.unix(item).format("MM/DD/YYYY hh:mm a")
      }
      return "(Unknown)"
    },
    detailTransformer: () => {
      return ""
    },
  },
}

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    activityEncountered: (immerState, { payload }) => {
      const activityItem = payload.tx
      const detailRows = renameAndPickKeys(keysMap, activityItem)

      payload.forAccounts.forEach((account: string) => {
        const address = account.toLowerCase()

        if (!immerState[address]) {
          immerState[address] = []
        }

        insertActivityItemSorted(immerState[address], {
          ...activityItem,
          detailRows,
        })
      })
    },
  },
})

export type Events = {
  activityEncountered: AnyEVMTransaction
}

export const { activityEncountered } = activitiesSlice.actions
export default activitiesSlice.reducer
