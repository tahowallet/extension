import Networks, { NetworksState } from "./networks"
import Transactions, { TransactionsState } from "./transactions"
import Accounts, { AccountsState } from "./accounts"
import { apiStubs } from "./temp-stubs"
import { STATE_KEY } from "./constants"
import { DEFAULT_STATE } from "./constants/default-state"
import { migrate } from "./migrations"

// import { Keys } from './keys'

import { getPersistedState, persistState } from "./lib/db"
import ObsStore from "./lib/ob-store"
import getFiatValue from "./lib/getFiatValues"

export interface MainState {
  accounts: AccountsState
  transactions: TransactionsState
  networks: NetworksState
}

class Main {
  state: ObsStore<MainState>

  network: Networks

  transactions: Transactions

  accounts: Accounts

  _subscriptionIds: any

  keys: any

  constructor(state: MainState = DEFAULT_STATE) {
    this.state = new ObsStore<MainState>(state)
    const { accounts, networks, transactions } = state
    const { providers } = (this.network = new Networks(networks))
    const provider = providers.ethereum.selected
    this.transactions = new Transactions(
      transactions,
      providers.ethereum.selected,
      getFiatValue
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
    this._subscriptionIds = {}
    this._subscribeToStates()
  }

  /*
    Returns a object containing all api methods for use
  */
  getApi() {
    return apiStubs
  }

  registerSubscription({ route, params, handler, id }) {
    if (!this._subscriptionIds[`${route}${JSON.stringify(params)}`]) {
      this._subscriptionIds[`${route}${JSON.stringify(params)}`] = []
    }
    this._subscriptionIds[`${route}${JSON.stringify(params)}`].push({
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

  async _import({ address, data, type, name }) {
    if (data) {
      return this.keys.import({ type, data, name })
    }
    return this.accounts.add(address)
  }

  _subscribeToStates() {
    this.transactions.state.on("update", (state) => {
      this.state.updateState({ transactions: state })
    })
    this.network.state.on("update", (state) => {
      this.state.updateState({ networks: state })
    })
  }
}

export { connectToBackgroundApi } from "./lib/connect"

export async function startApi() {
  const rawState = await getPersistedState(STATE_KEY)
  const newVersionState = await migrate(rawState)
  persistState(STATE_KEY, newVersionState)
  const main = new Main(newVersionState.state)
  return { main }
}
