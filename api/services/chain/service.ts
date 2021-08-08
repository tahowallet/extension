import {
  AlchemyProvider,
  AlchemyWebSocketProvider,
} from "@ethersproject/providers"

import { AccountBalance, AccountNetwork } from "../../types"
import { ETHEREUM } from "../../constants/networks"
import { ETH } from "../../constants/currencies"
import PreferenceService from "../preferences/service"
import { Service } from ".."
import { getOrCreateDB, ChainDatabase } from "./db"

const ALCHEMY_KEY = "8R4YNuff-Is79CeEHM2jzj2ssfzJcnfa"

export default class ChainService implements Service {
  preferenceService: PreferenceService

  db?: ChainDatabase

  pollingProviders: { [networkName: string]: AlchemyProvider }

  websocketProviders: { [networkName: string]: AlchemyWebSocketProvider }

  subscribedAccounts: {
    account: string
    provider: AlchemyWebSocketProvider
  }[]

  constructor(preferenceService: PreferenceService) {
    this.preferenceService = preferenceService

    // TODO set up for each relevant network
    this.pollingProviders = {
      ethereum: new AlchemyProvider(
        { name: "homestead", chainId: 1 },
        ALCHEMY_KEY
      ),
    }
    this.websocketProviders = {
      ethereum: new AlchemyWebSocketProvider(
        { name: "homestead", chainId: 1 },
        ALCHEMY_KEY
      ),
    }
    this.subscribedAccounts = []
  }

  async startService(): Promise<void> {
    this.db = await getOrCreateDB()
    const accounts = await this.getAccountsToTrack()
    await Promise.all(
      accounts
        .map(
          // subscribe to all account transactions
          (an) => this.subscribeToAccountTransaction(an)
        )
        .concat(
          // do a base-asset balance check for every account
          accounts.map(async (an) => {
            await this.getLatestBaseAccountBalance(an)
          })
        )
    )
  }

  async stopService(): Promise<void> {}

  async getAccountsToTrack(): Promise<AccountNetwork[]> {
    return this.db.getAccountsToTrack()
  }

  async subscribeToAccountTransaction(
    accountNetwork: AccountNetwork
  ): Promise<void> {
    // TODO look up provider network properly
    const provider = this.websocketProviders.ethereum
    await provider._subscribe(
      "alchemy_filteredNewFullPendingTransactions",
      [{ address: accountNetwork.account }],
      (result: any) => {
        // TODO handle incoming transactions for an account!
      }
    )
    this.subscribedAccounts.push({
      account: accountNetwork.account,
      provider,
    })
  }

  async getLatestBaseAccountBalance(
    accountNetwork: AccountNetwork
  ): Promise<AccountBalance> {
    // TODO look up provider network properly
    const balance = await this.pollingProviders.ethereum.getBalance(
      accountNetwork.account
    )
    const accountBalance = {
      account: accountNetwork.account,
      assetAmount: {
        asset: ETH,
        amount: balance.toBigInt(),
      },
      network: ETHEREUM,
      provenance: "alchemy", // TODO do this properly (eg provider isn't Alchemy)
      retrievedAt: Date.now(),
    }
    await this.db.balances.add(accountBalance)
    return accountBalance
  }

  async addAccountToTrack(accountNetwork: AccountNetwork): Promise<void> {
    const current = await this.getAccountsToTrack()
    await this.db.setAccountsToTrack(current.concat([accountNetwork]))
    await this.getLatestBaseAccountBalance(accountNetwork)
    await this.subscribeToAccountTransaction(accountNetwork)
    // TODO get the last 30 days of transactions for new accounts
    // * any of those contracts that are ERC-20s should be added to tokensToTrack
  }

  // TODO removing an account to track
  // TODO getting transaction contents from hash + network, confirmed + mempool, including cached & local transactions
  // TODO incoming + outgoing tx subscription
  // TODO account history
  // TODO account balance change subscription
}
