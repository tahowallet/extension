// Disable parameter reassign rule to be able to modify the activities object freely
// that way we can avoid nested object iteration and we can initialize object fields
/* eslint-disable no-param-reassign */

import { createSlice } from "@reduxjs/toolkit"
import { AddressOnNetwork } from "../accounts"
import {
  normalizeAddressOnNetwork,
  normalizeEVMAddress,
  sameEVMAddress,
} from "../lib/utils"
import { AnyEVMTransaction, isEIP1559TransactionRequest } from "../networks"
import { Transaction } from "../services/chain/db"
import { EnrichedEVMTransaction } from "../services/enrichment"
import { HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"
import {
  sortActivities,
  getActivity,
  Activity,
  ActivityDetail,
  INFINITE_VALUE,
} from "./utils/activities-utils"
import { getProvider } from "./utils/contract-utils"

export { Activity, ActivityDetail, INFINITE_VALUE }
export type Activities = {
  [address: string]: {
    [chainID: string]: Activity[]
  }
}

type TrackedReplacementTx = {
  chainID: string
  hash: string
  parentTx: string
  initiator: string
}

type ActivitiesState = {
  activities: Activities
  replacementTransactions: TrackedReplacementTx[]
}

const ACTIVITIES_MAX_COUNT = 25

const cleanActivitiesArray = (activitiesArray: Activity[] = []) => {
  activitiesArray.sort(sortActivities)
  activitiesArray.splice(ACTIVITIES_MAX_COUNT)
}

const addActivityToState =
  (activities: Activities) =>
  (
    address: string,
    chainID: string,
    transaction: Transaction | EnrichedEVMTransaction
  ) => {
    const activity = getActivity(transaction)
    const normalizedAddress = normalizeEVMAddress(address)

    activities[normalizedAddress] ??= {}
    activities[normalizedAddress][chainID] ??= []

    const exisistingIndex = activities[normalizedAddress][chainID].findIndex(
      (tx) => tx.hash === transaction.hash
    )

    if (exisistingIndex !== -1) {
      activities[normalizedAddress][chainID][exisistingIndex] = activity
    } else {
      activities[normalizedAddress][chainID].push(activity)
    }
  }

const initializeActivitiesFromTransactions = ({
  transactions,
  accounts,
}: {
  transactions: Transaction[]
  accounts: AddressOnNetwork[]
}): Activities => {
  const activities: {
    [address: string]: {
      [chainID: string]: Activity[]
    }
  } = {}

  const addActivity = addActivityToState(activities)

  const normalizedAccounts = accounts.map((account) =>
    normalizeAddressOnNetwork(account)
  )

  // Add transactions
  transactions.forEach((transaction) => {
    const { to, from, network } = transaction
    const isTrackedTo = normalizedAccounts.some(
      ({ address, network: activeNetwork }) =>
        network.chainID === activeNetwork.chainID && sameEVMAddress(to, address)
    )
    const isTrackedFrom = normalizedAccounts.some(
      ({ address, network: activeNetwork }) =>
        network.chainID === activeNetwork.chainID &&
        sameEVMAddress(from, address)
    )

    if (to && isTrackedTo) {
      addActivity(to, network.chainID, transaction)
    }
    if (from && isTrackedFrom) {
      addActivity(from, network.chainID, transaction)
    }
  })

  // Sort and reduce # of transactions
  normalizedAccounts.forEach(({ address, network }) =>
    cleanActivitiesArray(activities[address]?.[network.chainID])
  )

  return activities
}

const initialState: ActivitiesState = {
  activities: {},
  replacementTransactions: [],
}

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    initializeActivities: (
      immerState,
      {
        payload,
      }: {
        payload: { transactions: Transaction[]; accounts: AddressOnNetwork[] }
      }
    ) => {
      immerState.activities = initializeActivitiesFromTransactions(payload)
      // Clear these at extension restart
      immerState.replacementTransactions = []
    },
    initializeActivitiesForAccount: (
      immerState,
      {
        payload: { transactions, account },
      }: { payload: { transactions: Transaction[]; account: AddressOnNetwork } }
    ) => {
      const {
        address,
        network: { chainID },
      } = account
      transactions.forEach((transaction) =>
        addActivityToState(immerState.activities)(address, chainID, transaction)
      )
      cleanActivitiesArray(
        immerState.activities[normalizeEVMAddress(address)]?.[chainID]
      )
    },
    removeActivities: (
      immerState,
      { payload: address }: { payload: HexString }
    ) => {
      immerState.activities[address] = {}
    },
    addActivity: (
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
      const { chainID } = transaction.network
      forAccounts.forEach((address) => {
        addActivityToState(immerState.activities)(address, chainID, transaction)
        cleanActivitiesArray(
          immerState.activities[normalizeEVMAddress(address)]?.[chainID]
        )
      })

      immerState.replacementTransactions ??= []

      const { replacementTransactions } = immerState

      const replacement = replacementTransactions.find(
        (request) =>
          request.hash === transaction.hash &&
          request.chainID === transaction.network.chainID
      )

      // Remove parent tx if it's replacement tx succeded
      if (replacement && transaction.blockHeight) {
        Object.keys(immerState.activities).forEach((address) => {
          immerState.activities[address][replacement.chainID] =
            immerState.activities[address][replacement.chainID].filter(
              (activity) => activity.hash !== replacement.parentTx
            )
        })
      }
    },
    addReplacementTransaction: (
      immerState,
      { payload }: { payload: TrackedReplacementTx }
    ) => {
      immerState.replacementTransactions ??= []
      const { replacementTransactions } = immerState
      if (
        !replacementTransactions.some(
          (request) =>
            request.hash === payload.hash && request.chainID === payload.chainID
        )
      ) {
        replacementTransactions.push(payload)
      }
    },
    removeReplacedTransaction: (
      immerState,
      { payload }: { payload: AnyEVMTransaction }
    ) => {
      immerState.replacementTransactions ??= []

      const { replacementTransactions } = immerState

      const replacement = replacementTransactions.find(
        (request) =>
          request.hash === payload.hash &&
          request.chainID === payload.network.chainID
      )

      // Remove parent tx if it's replacement tx succeded
      if (replacement && payload.blockHeight) {
        Object.keys(immerState.activities).forEach((address) => {
          immerState.activities[address][replacement.chainID] =
            immerState.activities[address][replacement.chainID].filter(
              (activity) => activity.hash !== replacement.parentTx
            )
        })
      }
    },
  },
})

export const {
  initializeActivities,
  addActivity,
  removeActivities,
  initializeActivitiesForAccount,
  addReplacementTransaction,
  removeReplacedTransaction,
} = activitiesSlice.actions

export default activitiesSlice.reducer

export const fetchSelectedActivityDetails = createBackgroundAsyncThunk(
  "activities/fetchSelectedActivityDetails",
  async (activityHash: string, { extra: { main } }) => {
    return main.getActivityDetails(activityHash)
  }
)

export const speedUpTx = createBackgroundAsyncThunk(
  "activities/speedupTx",
  async (tx: Transaction | EnrichedEVMTransaction, { dispatch }) => {
    const { input, from, to, value, nonce, gasLimit } = tx
    const provider = getProvider()
    const signer = provider.getSigner()
    const isEIP1559Tx = isEIP1559TransactionRequest(tx)

    if ((isEIP1559Tx && !tx.maxFeePerGas) || (!isEIP1559Tx && !tx.gasPrice)) {
      throw new Error("Cannot speed up transaction without a valid gas price")
    }

    const TxRequest = {
      data: input || "0x",
      from,
      to,
      value,
      gasLimit,
      nonce,
      type: tx.type as 0,
    }

    if (isEIP1559Tx) {
      Object.assign(TxRequest, {
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: (tx.maxPriorityFeePerGas * 125n) / 100n,
      })
    } else {
      Object.assign(TxRequest, {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        gasPrice: (tx.gasPrice! * 125n) / 100n,
      })
    }

    const newTx = await signer.sendTransaction(TxRequest)

    dispatch(
      addReplacementTransaction({
        hash: newTx.hash,
        chainID: tx.network.chainID,
        parentTx: tx.hash,
        initiator: tx.from,
      })
    )
  }
)
