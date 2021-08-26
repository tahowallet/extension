import { wrapStore } from "webext-redux"
import { configureStore } from "@reduxjs/toolkit"

import Networks, { NetworksState } from "./networks"
import Transactions, { TransactionsState } from "./transactions"
import Accounts, { AccountsState } from "./accounts"
import { SmartContractFungibleAsset } from "./types"

import { ETHEREUM } from "./constants/networks"
import { DEFAULT_STATE } from "./constants/default-state"

import {
  startService as startPreferences,
  PreferenceService,
} from "./services/preferences"
import {
  startService as startIndexing,
  IndexingService,
} from "./services/indexing"
import { startService as startChain, ChainService } from "./services/chain"

import ObsStore from "./lib/ob-store"
import { getPrice } from "./lib/prices"
import rootReducer from "./redux-slices"
import { subscribeToChainService } from "./redux-slices/account"

interface MainState {
  accounts: AccountsState
  transactions: TransactionsState
  networks: NetworksState
  tokensToTrack: SmartContractFungibleAsset[]
}

// Declared out here so StoreType can be used in Main.store type declaration.
const initializeStore = (chainService: Promise<ChainService>) =>
  configureStore({ reducer: rootReducer(chainService) })
type ReduxStoreType = ReturnType<typeof initializeStore>

export default class Main {
  private state: ObsStore<MainState>

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

  /**
   * The redux store for the wallet core. Note that the redux store is used to
   * render the UI (via webext-redux), but it is _not_ the source of truth.
   * Services interact with the various external and internal components and
   * create persisted state, and the redux store is simply a view onto those
   * pieces of canonical state.
   */
  store: ReduxStoreType

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
    this.initializeRedux()
  }

  initializeServices(): void {
    this.preferenceService = startPreferences()
    this.chainService = startChain(this.preferenceService).then(
      async (service) => {
        await service.addAccountToTrack({
          // TODO uses Ethermine address for development - move this to startup
          // state
          account: "0xea674fdde714fd979de3edf0f56aa9716b898ec8",
          network: ETHEREUM,
        })
        return service
      }
    )
    this.indexingService = startIndexing(
      this.preferenceService,
      this.chainService
    )
  }

  async initializeRedux(): Promise<void> {
    this.store = initializeStore(this.chainService)
    // Start up the redux store.
    wrapStore(this.store)

    this.store.dispatch(subscribeToChainService())
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

  private subscribeToStates() {
    this.transactions.state.on("update", (state) => {
      this.state.updateState({ transactions: state })
    })
    this.network.state.on("update", (state) => {
      this.state.updateState({ networks: state })
    })
  }
}
