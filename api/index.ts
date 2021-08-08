import Networks, { NetworksState } from "./networks"
import Transactions, { TransactionsState } from "./transactions"
import Accounts, { AccountsState } from "./accounts"
import { SmartContractFungibleAsset } from "./types"
import { apiStubs } from "./temp-stubs"
import { STATE_KEY } from "./constants"
import { DEFAULT_STATE } from "./constants/default-state"
import { migrate } from "./migrations"
import startPreferences from "./services/preferences"
import startChain from "./services/chain"
import startIndexing from "./services/indexing"

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

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T

class Main {
  state: ObsStore<MainState>

  network: Networks

  transactions: Transactions

  accounts: Accounts

  private subscriptionIds: any

  keys: any

  preferenceService: Awaited<ReturnType<typeof startPreferences>> | null

  chainService: Awaited<ReturnType<typeof startChain>> | null

  indexingService: Awaited<ReturnType<typeof startIndexing>> | null

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
    this.initialize()
  }

  async initialize() {
    this.preferenceService = await startPreferences()
    this.chainService = await startChain(this.preferenceService)
    this.indexingService = await startIndexing(
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

export async function startApi() {
  const rawState = await getPersistedState(STATE_KEY)
  const newVersionState = await migrate(rawState)
  persistState(STATE_KEY, newVersionState)
  const main = new Main(newVersionState.state)
  return { main }
}
