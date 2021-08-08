import Dexie from "dexie"

import {
  AccountBalance,
  AccountNetwork,
  FungibleAsset,
  Network,
} from "../../types"

// TODO application data atop transactions (eg token balances)

export interface Transaction {
  hash: string
  from: string
  to: string
  gas: BigInt
  gasPrice: BigInt
  input: string
  nonce: BigInt
  value: BigInt
  dataSource: "local" | "alchemy"
  network: Network
}

export interface ConfirmedTransaction extends Transaction {
  blockHash: string
  blockNumber: string
}

export interface SignedTransaction extends Transaction {
  r: string
  s: string
  v: string
}

export interface SignedConfirmedTransaction
  extends SignedTransaction,
    ConfirmedTransaction {}

export interface Migration {
  id: number
  appliedAt: number
}

export class ChainDatabase extends Dexie {
  /*
   * Accounts whose transaction and balances should be tracked on a particular
   * network.
   */
  accountsToTrack: Dexie.Table<AccountNetwork, number>

  /*
   *
   */
  transactions: Dexie.Table<
    | Transaction
    | ConfirmedTransaction
    | SignedTransaction
    | SignedConfirmedTransaction,
    number
  >

  /*
   * Historic account balances.
   */
  balances: Dexie.Table<AccountBalance, number>

  migrations: Dexie.Table<Migration, number>

  constructor() {
    super("tally/chain")
    this.version(1).stores({
      migrations: "++id,appliedAt",
      accountsToTrack:
        "++id,account,network.family,network.chainID,network.name",
      balances:
        "++id,account,assetAmount.amount,assetAmount.asset.symbol,network.name,blockHeight,retrievedAt",
      transactions:
        "&[hash+network.name],hash,from,[from+network.name],to,[to+network.name],nonce,[nonce+from+network.name],blockHash,blockNumber,network.name",
    })
  }

  async getTransaction(
    network: Network,
    txHash: string
  ): Promise<
    | Transaction
    | ConfirmedTransaction
    | SignedTransaction
    | SignedConfirmedTransaction
    | null
  > {
    return (
      (
        await this.transactions
          .where("[hash+network.name]")
          .equals([txHash, network.name])
          .toArray()
      )[0] || null
    )
  }

  async getLatestAccountBalance(
    account: string,
    network: Network,
    asset: FungibleAsset
  ): Promise<AccountBalance | null> {
    // TODO this needs to be tightened up, both for performance and specificity
    const balanceCandidates = await this.balances
      .where("retrievedAt")
      .above(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .filter(
        (balance) =>
          balance.account === account &&
          balance.assetAmount.asset.symbol === asset.symbol &&
          balance.network.name === network.name
      )
      .reverse()
      .sortBy("retrievedAt")
    return balanceCandidates.length > 0 ? balanceCandidates[0] : null
  }

  async setAccountsToTrack(
    accountAndNetworks: AccountNetwork[]
  ): Promise<void> {
    await this.transaction("rw", this.accountsToTrack, () => {
      this.accountsToTrack.clear()
      this.accountsToTrack.bulkAdd(accountAndNetworks)
    })
  }

  async getAccountsToTrack(): Promise<AccountNetwork[]> {
    return this.accountsToTrack.toArray()
  }
}

export async function getDB(): Promise<ChainDatabase> {
  return new ChainDatabase()
}

export async function getOrCreateDB(): Promise<ChainDatabase> {
  const db = await getDB()
  const numMigrations = await db.migrations.count()
  if (numMigrations === 0) {
    await db.transaction("rw", db.migrations, async () => {
      db.migrations.add({ id: 0, appliedAt: Date.now() })
      // TODO decide migrations before the initial release
    })
  }
  return db
}
