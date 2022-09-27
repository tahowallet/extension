import { createSlice } from "@reduxjs/toolkit"
import { AddressOnNetwork } from "../accounts"
import {
  normalizeAddressOnNetwork,
  normalizeEVMAddress,
  sameEVMAddress,
} from "../lib/utils"
import { Transaction } from "../services/chain/db"
import { EnrichedEVMTransaction } from "../services/enrichment"

export type ActivityOnChain = {
  to?: string
  from: string
  blockHeight: number | null
  value: bigint
  nonce: number
  hash: string
}

export type ActivitesOnChainState = {
  [address: string]: {
    [chainID: string]: ActivityOnChain[]
  }
}

const sortActivities = (a: ActivityOnChain, b: ActivityOnChain): number => {
  if (
    a.blockHeight === null ||
    b.blockHeight === null ||
    a.blockHeight === b.blockHeight
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
}

const addActivityToState =
  (activities: ActivitesOnChainState) =>
  (address: string, chainID: string, transaction: Transaction) => {
    const normalizedAddress = normalizeEVMAddress(address)

    activities[normalizedAddress] ??= {} // eslint-disable-line no-param-reassign
    activities[normalizedAddress][chainID] ??= [] // eslint-disable-line no-param-reassign
    // TODO: check if this is add or update
    activities[normalizedAddress][chainID].push({
      to: transaction.to && normalizeEVMAddress(transaction.to),
      from: normalizeEVMAddress(transaction.from),
      blockHeight: transaction.blockHeight,
      value: transaction.value,
      nonce: transaction.nonce,
      hash: transaction.hash,
    })
  }

const initializeActivitiesFromTransactions = ({
  transactions,
  accounts,
}: {
  transactions: Transaction[]
  accounts: AddressOnNetwork[]
}): ActivitesOnChainState => {
  const activities: {
    [address: string]: {
      [chainID: string]: ActivityOnChain[]
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

  // Sort transactions
  normalizedAccounts.forEach(({ address, network }) =>
    activities[address][network.chainID]?.sort(sortActivities)
  )

  return activities
}

const initialState: ActivitesOnChainState = {}

const activitiesOnChainSlice = createSlice({
  name: "activitiesOnChain",
  initialState,
  reducers: {
    initializeActivities: (
      immerState,
      {
        payload,
      }: {
        payload: { transactions: Transaction[]; accounts: AddressOnNetwork[] }
      }
    ) => initializeActivitiesFromTransactions(payload),
    activityOnChainEncountered: (
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
        addActivityToState(immerState)(
          address,
          chainID,
          transaction as Transaction
        )
        immerState[normalizeEVMAddress(address)][chainID].sort(sortActivities)
      })
    },
  },
})

export const { initializeActivities, activityOnChainEncountered } =
  activitiesOnChainSlice.actions

export default activitiesOnChainSlice.reducer
