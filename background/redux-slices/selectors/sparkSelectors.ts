import { createSelector } from "@reduxjs/toolkit"
import type { RootState } from ".."
import type { AnyAssetAmount, FungibleAsset } from "../../assets"
import type { SparkAddressOnNetwork } from "../../accounts"
import type { SparkAccount, SparkBalance } from "../../services/spark/types"
import { sparkNetworkByChainID } from "../../constants/spark"
import type { Activity } from "../utils/activities-utils"
import type { SparkAddress } from "../../types"
import { truncateAddress } from "../../lib/utils"

const selectSparkState = (state: RootState) => state.spark

export const selectSparkAccounts = createSelector(
  selectSparkState,
  (spark): SparkAccount[] =>
    Object.values(spark.accounts).sort((a, b) => a.addedAt - b.addedAt),
)

/**
 * A Spark balance as the asset amounts every other account kind is
 * described with, so Spark flows through the same pricing, dust and
 * verification logic as EVM balances.
 */
export function sparkBalanceAssetAmounts(
  account: SparkAccount,
  balance: SparkBalance | undefined,
): AnyAssetAmount[] {
  if (!balance) {
    return []
  }
  return [
    { asset: account.network.baseAsset, amount: balance.owned },
    ...balance.tokens.map((token): AnyAssetAmount => ({
      asset: {
        name: token.name,
        symbol: token.ticker,
        decimals: token.decimals,
        metadata: { tokenLists: [] },
      } satisfies FungibleAsset,
      amount: token.owned,
    })),
  ]
}

/**
 * Every Spark account with its balance as asset amounts.
 */
export const selectSparkAccountAssetAmounts = createSelector(
  selectSparkAccounts,
  selectSparkState,
  (accounts, spark) =>
    accounts.map((account) => ({
      account,
      assetAmounts: sparkBalanceAssetAmounts(
        account,
        spark.balances[account.id],
      ),
      retrievedAt: spark.balances[account.id]?.retrievedAt,
    })),
)

/**
 * The Spark account shown when a Spark network is picked in the network
 * selector: the first account on that network, if any.
 */
export const selectCurrentSparkAccount = createSelector(
  (state: RootState) => state.ui.selectedSparkChainID,
  selectSparkAccounts,
  (chainID, accounts): SparkAccount | undefined =>
    chainID === null || chainID === undefined
      ? undefined
      : accounts.find((account) => account.network.chainID === chainID),
)

export const selectCurrentSparkAddressOnNetwork = createSelector(
  selectCurrentSparkAccount,
  (account): SparkAddressOnNetwork | undefined =>
    account && { address: account.address, network: account.network },
)

export const selectCurrentSparkNetwork = createSelector(
  (state: RootState) => state.ui.selectedSparkChainID,
  (chainID) =>
    chainID === null || chainID === undefined
      ? undefined
      : sparkNetworkByChainID(chainID),
)

const SPARK_STATUS_COMPLETED = new Set(["TRANSFER_STATUS_COMPLETED"])
const SPARK_STATUS_FAILED = new Set([
  "TRANSFER_STATUS_EXPIRED",
  "TRANSFER_STATUS_RETURNED",
])

/**
 * The current Spark account's transfers as wallet activities, the shape the
 * wallet's activity list renders for every network.
 */
export const selectCurrentSparkActivities = createSelector(
  selectCurrentSparkAccount,
  selectSparkState,
  (account, spark): Activity[] => {
    if (!account) {
      return []
    }
    const { decimals, symbol } = account.network.baseAsset
    return (spark.activity[account.id] ?? []).map((item) => {
      // Lightning and deposit counterparties are Spark's service provider,
      // known only by identity key when no address can be derived.
      const counterparty: { address?: SparkAddress; name?: string } =
        item.counterpartyAddress
          ? { address: item.counterpartyAddress }
          : { name: truncateAddress(item.counterpartyIdentityPublicKey) }
      const self: { address?: SparkAddress; name?: string } = {
        address: account.address,
      }
      const [sender, recipient] =
        item.direction === "outgoing"
          ? [self, counterparty]
          : [counterparty, self]
      const completed = SPARK_STATUS_COMPLETED.has(item.status)
      const failed = SPARK_STATUS_FAILED.has(item.status)
      return {
        type: "asset-transfer" as const,
        // Completed and failed transfers carry a status like mined
        // transactions; pending ones don't, which the list shows as pending.
        ...(completed || failed ? { status: completed ? 1 : 0 } : {}),
        blockHash: completed || failed ? item.id : null,
        blockHeight: null,
        blockTimestamp:
          item.createdAt === undefined
            ? undefined
            : Math.floor(item.createdAt / 1000),
        hash: item.id,
        from: sender.address ?? sender.name ?? "",
        to: recipient.address ?? recipient.name,
        sender,
        recipient,
        value: (Number(item.amountSats) / 10 ** decimals).toString(),
        fixedPointValue: { amount: item.amountSats, decimals },
        nonce: 0,
        assetSymbol: symbol,
      }
    })
  },
)
