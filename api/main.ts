import { wrapStore } from "webext-redux"
import { configureStore, isPlain } from "@reduxjs/toolkit"

import { ETHEREUM } from "./constants/networks"

import {
  startService as startPreferences,
  PreferenceService,
} from "./services/preferences"
import {
  startService as startIndexing,
  IndexingService,
} from "./services/indexing"
import { startService as startChain, ChainService } from "./services/chain"

import rootReducer from "./redux-slices"
import {
  loadAccount,
  transactionConfirmed,
  transactionSeen,
  updateAccountBalance,
  emitter as accountSliceEmitter,
} from "./redux-slices/account"
import { assetsLoaded } from "./redux-slices/assets"

// Declared out here so ReduxStoreType can be used in Main.store type
// declaration.
const initializeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          isSerializable: (value: unknown) =>
            isPlain(value) || typeof value === "bigint",
        },
      }),
  })

type ReduxStoreType = ReturnType<typeof initializeStore>

export default class Main {
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

  constructor() {
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
    // Start up the redux store and set it up for proxying.
    this.store = initializeStore()
    wrapStore(this.store, {
      serializer: (payload: unknown) =>
        JSON.stringify(payload, (_, value) =>
          typeof value === "bigint" ? { B_I_G_I_N_T: value.toString() } : value
        ),
      deserializer: (payload: string) =>
        JSON.parse(payload, (_, value) =>
          value !== null && typeof value === "object" && "B_I_G_I_N_T" in value
            ? BigInt(value.B_I_G_I_N_T)
            : value
        ),
    })

    this.connectIndexingService()
    await this.connectChainService()
  }

  async connectChainService(): Promise<void> {
    const chain = await this.chainService

    // Wire up chain service to account slice.
    chain.emitter.on("accountBalance", (accountWithBalance) => {
      // The first account balance update will transition the account to loading.
      this.store.dispatch(updateAccountBalance(accountWithBalance))
    })
    chain.emitter.on("transaction", (transaction) => {
      if (transaction.blockHash) {
        this.store.dispatch(transactionConfirmed(transaction))
      } else {
        this.store.dispatch(transactionSeen(transaction))
      }
    })

    accountSliceEmitter.on("addAccount", async (accountNetwork) => {
      await chain.addAccountToTrack(accountNetwork)
    })

    // Set up initial state.
    const existingAccounts = await chain.getAccountsToTrack()
    existingAccounts.forEach((accountNetwork) => {
      // Mark as loading and wire things up.
      this.store.dispatch(loadAccount(accountNetwork.account))

      // Force a refresh of the account balance to populate the store.
      chain.getLatestBaseAccountBalance(accountNetwork)
    })
  }

  async connectIndexingService(): Promise<void> {
    const indexing = await this.indexingService

    indexing.emitter.on("accountBalance", (accountWithBalance) => {
      this.store.dispatch(updateAccountBalance(accountWithBalance))
    })

    indexing.emitter.on("assets", (assets) => {
      this.store.dispatch(assetsLoaded(assets))
    })
  }
}
