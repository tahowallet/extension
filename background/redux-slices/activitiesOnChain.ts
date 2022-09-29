import { createSlice } from "@reduxjs/toolkit"
import { AddressOnNetwork } from "../accounts"
import { assetAmountToDesiredDecimals } from "../assets"
import {
  isMaxUint256,
  normalizeAddressOnNetwork,
  normalizeEVMAddress,
  sameEVMAddress,
} from "../lib/utils"
import { Transaction } from "../services/chain/db"
import { EnrichedEVMTransaction } from "../services/enrichment"
import { HexString } from "../types"

const ACTIVITIES_MAX_COUNT = 25
const VALUE_DECIMALS = 2
export const INFINITE_VALUE = "infinite"

export type ActivityOnChain = {
  status?: number
  type?: string
  to?: string
  recipient: { address?: HexString; name?: string }
  sender: { address?: HexString; name?: string }
  from: string
  blockHeight: number | null
  value: string
  nonce: number
  hash: string
  blockHash: string | null
  blockTimestamp?: number
  assetSymbol: string
  assetLogoUrl?: string
}

export type ActivitesOnChainState = {
  [address: string]: {
    [chainID: string]: ActivityOnChain[]
  }
}

function isEnrichedTransaction(
  transaction: Transaction | EnrichedEVMTransaction
): transaction is EnrichedEVMTransaction {
  return "annotation" in transaction
}

function getRecipient(transaction: EnrichedEVMTransaction): {
  address?: HexString
  name?: string
} {
  const { annotation } = transaction

  switch (annotation?.type) {
    case "asset-transfer":
      return {
        address: annotation.recipient?.address,
        name: annotation.recipient?.annotation.nameRecord?.resolved
          .nameOnNetwork.name,
      }
    case "contract-interaction":
      return {
        address: transaction.to,
        name: annotation.contractInfo?.annotation.nameRecord?.resolved
          .nameOnNetwork.name,
      }
    case "asset-approval":
      return {
        address: annotation.spender.address,
        name: annotation.spender.annotation?.nameRecord?.resolved.nameOnNetwork
          .name,
      }
    default:
      return { address: transaction.to }
  }
}

function getSender(transaction: EnrichedEVMTransaction): {
  address?: HexString
  name?: string
} {
  const { annotation } = transaction

  switch (annotation?.type) {
    case "asset-transfer":
      return {
        address: annotation.sender.address,
        name: annotation.sender?.annotation.nameRecord?.resolved.nameOnNetwork
          .name,
      }
    default:
      return { address: transaction.from }
  }
}

const getAssetSymbol = (transaction: EnrichedEVMTransaction) => {
  const { annotation } = transaction

  switch (annotation?.type) {
    case "asset-transfer":
    case "asset-approval":
      return annotation.assetAmount.asset.symbol
    default:
      return transaction.asset.symbol
  }
}

const getValue = (transaction: Transaction | EnrichedEVMTransaction) => {
  const { asset, value } = transaction
  const localizedValue = assetAmountToDesiredDecimals(
    {
      asset,
      amount: value,
    },
    VALUE_DECIMALS
  ).toLocaleString("default", {
    maximumFractionDigits: VALUE_DECIMALS,
  })

  if (isEnrichedTransaction(transaction)) {
    const { annotation } = transaction
    switch (annotation?.type) {
      case "asset-transfer":
        return annotation.assetAmount.localizedDecimalAmount
      case "asset-approval":
        return isMaxUint256(annotation.assetAmount.amount)
          ? INFINITE_VALUE
          : annotation.assetAmount.localizedDecimalAmount
      default:
        return localizedValue
    }
  }

  return localizedValue
}

const getActivity = (
  transaction: Transaction | EnrichedEVMTransaction
): ActivityOnChain => {
  const { to, from, blockHeight, nonce, hash, blockHash, asset } = transaction

  let activity: ActivityOnChain = {
    status: "status" in transaction ? transaction.status : undefined,
    to: to && normalizeEVMAddress(to),
    from: normalizeEVMAddress(from),
    recipient: { address: to },
    sender: { address: from },
    blockHeight,
    assetSymbol: asset.symbol,
    nonce,
    hash,
    blockHash,
    value: getValue(transaction),
  }

  if (isEnrichedTransaction(transaction)) {
    const { annotation } = transaction

    activity = {
      ...activity,
      type: annotation?.type,
      value: getValue(transaction),
      blockTimestamp: annotation?.blockTimestamp,
      assetLogoUrl: annotation?.transactionLogoURL,
      assetSymbol: getAssetSymbol(transaction),
      recipient: getRecipient(transaction),
      sender: getSender(transaction),
    }
  }

  return activity
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

const cleanActivitiesArray = (activitiesArray: ActivityOnChain[]) => {
  activitiesArray.sort(sortActivities)
  activitiesArray.splice(ACTIVITIES_MAX_COUNT)
}

const addActivityToState =
  (activities: ActivitesOnChainState) =>
  (
    address: string,
    chainID: string,
    transaction: Transaction | EnrichedEVMTransaction
  ) => {
    const activity = getActivity(transaction)
    const normalizedAddress = normalizeEVMAddress(address)

    activities[normalizedAddress] ??= {} // eslint-disable-line no-param-reassign
    activities[normalizedAddress][chainID] ??= [] // eslint-disable-line no-param-reassign

    const exisistingIndex = activities[normalizedAddress][chainID].findIndex(
      (tx) => tx.hash === transaction.hash
    )

    if (exisistingIndex !== -1) {
      activities[normalizedAddress][chainID][exisistingIndex] = activity // eslint-disable-line no-param-reassign
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

  // Sort and reduce # of transactions
  normalizedAccounts.forEach(({ address, network }) =>
    cleanActivitiesArray(activities[address][network.chainID])
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
        addActivityToState(immerState)(address, chainID, transaction)
        cleanActivitiesArray(immerState[normalizeEVMAddress(address)][chainID])
      })
    },
  },
})

export const { initializeActivities, activityOnChainEncountered } =
  activitiesOnChainSlice.actions

export default activitiesOnChainSlice.reducer
