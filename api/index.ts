import Networks, { NetworksState } from "./networks"
import Transactions, { TransactionsState } from "./transactions"
import Accounts, { AccountsState } from "./accounts"
import { SmartContractFungibleAsset } from "./types"
import { apiStubs } from "./temp-stubs"
import { STATE_KEY } from "./constants"
import { DEFAULT_STATE } from "./constants/default-state"
import { migrate } from "./migrations"
import {
  startService as startPreferences,
  PreferenceService,
} from "./services/preferences"
import {
  startService as startIndexing,
  IndexingService,
} from "./services/indexing"
import { startService as startChain, ChainService } from "./services/chain"

// import { Keys } from "./keys"

import { getPersistedState, persistState } from "./lib/db"
import ObsStore from "./lib/ob-store"
import { getPrice } from "./lib/prices"

export interface MainState {
  accounts: AccountsState
  transactions: TransactionsState
  networks: NetworksState
  tokensToTrack: SmartContractFungibleAsset[]
}

class Main {
  state: ObsStore<MainState>

  network: Networks

  transactions: Transactions

  accounts: Accounts

  private subscriptionIds: any

  keys: any

  /*
   * A promise to the preference service, a dependency for most other services.
   * The promise will be resolved when the service is initialized.
   */
  preferenceService: Promise<PreferenceService>

  /*
   * A promise to the chain service, keeping track of base asset balances,
   * transactions, and network status. The promise will be resolved when the
   * service is initialized.
   */
  chainService: Promise<ChainService>

  /*
   * A promise to the indexing service, keeping track of token balances and
   * prices. The promise will be resolved when the service is initialized.
   */
  indexingService: Promise<IndexingService>

  constructor(state: MainState = DEFAULT_STATE) {
    this.state = new ObsStore<MainState>(state)
    const { accounts, networks, transactions } = state
    this.network = new Networks(networks)
    const { providers } = this.network
    const provider = providers.ethereum.selected
    this.transactions = new Transactions(
      transactions,
      providers.ethereum.selected,
      getPrice
    )
    // this.keys = new Keys(state.keys || {})
    // const balances = this.balances = new Balances({ state: balances, providers })

    // this is temporary

    // this.userPrefernces = new ObsStore(state.userPrefernces || {})

    this.accounts = new Accounts(
      provider,
      accounts,
      this.transactions.getHistory.bind(this.transactions)
    )
    this.subscriptionIds = {}
    this.subscribeToStates()

    // start all services
    this.initializeServices()
  }

  async initializeServices() {
    this.preferenceService = startPreferences()
    this.chainService = startChain(this.preferenceService)
    this.indexingService = startIndexing(
      this.preferenceService,
      this.chainService
    )
  }

  /*
    Returns a object containing all api methods for use
  */
  // TODO Stubbed for now.
  // eslint-disable-next-line class-methods-use-this
  getApi() {
    return apiStubs
  }

  registerSubscription({ route, params, handler, id }) {
    if (!this.subscriptionIds[`${route}${JSON.stringify(params)}`]) {
      this.subscriptionIds[`${route}${JSON.stringify(params)}`] = []
    }
    this.subscriptionIds[`${route}${JSON.stringify(params)}`].push({
      handler,
      id,
    })
  }

  // used to start and stop the ws connections for new head subscription

  async connect() {
    this.network.providers.ethereum.selected.connect()
  }

  async disconnect() {
    this.network.providers.ethereum.selected.close()
  }

  private async import({ address, data, type, name }) {
    if (data) {
      return this.keys.import({ type, data, name })
    }
    return this.accounts.add(address)
  }

  private subscribeToStates() {
    this.transactions.state.on("update", (state) => {
      this.state.updateState({ transactions: state })
    })
    this.network.state.on("update", (state) => {
      this.state.updateState({ networks: state })
    })
  }
}

export { browser } from "webextension-polyfill-ts"
export { connectToBackgroundApi } from "./lib/connect"

export async function startApi(): Promise<{ main: Main }> {
  const rawState = await getPersistedState(STATE_KEY)
  const newVersionState = await migrate(rawState)
  persistState(STATE_KEY, newVersionState)
  const main = new Main(newVersionState.state)
  return { main }
}
