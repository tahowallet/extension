import Networks from './networks'
import Transactions from './transactions'
import Accounts from './accounts'
import { STATE_KEY } from './constants'
import { DEFAULT_STATE } from './constants/default-state'
import { migrate } from './migrations'

// import { Keys } from './keys'

import { getPersistedState, persistState } from './lib/db'
import ObsStore from './lib/ob-store'
import getFiatValue from './lib/getFiatValues'

export class Main {
  state : ObsStore
  network : Networks
  transactions : Transactions
  accounts : Accounts

  constructor ({ browser, state = DEFAULT_STATE}) {
    this.state = new ObsStore(state)
    const { accountsMetaData, balances, networks, supportedChains, transactions } = state
    const { providers } = this.network = new Networks({ networks })
    const provider = providers.ethereum.selected
    this.transactions = new Transactions({
      state: transactions,
      provider: providers.ethereum.selected,
      getFiatValue,
    })
    // this.keys = new Keys(state.keys || {})
    // const balances = this.balances = new Balances({ state: balances, providers })

    // this is temporary

    // this.userPrefernces = new ObsStore(state.userPrefernces || {})

    this.accounts = new Accounts({
      provider,
      accountsMetaData,
      getTransactionHistory: this.transactions.getHistory.bind(this.transactions),
    })
    this._subscribeToStates()
  }

  /*
    Returns a object containing all api methods for use
  */
  getApi () {
    return {
      '/accounts/': {
        GET: this.accounts.get.bind(this.accounts),
        POST: this._import.bind(this),
      },
    }
  }

  // used to start and stop the ws connections for new head subscription

  async connect () {
    this.network.providers.ethereum.selected.connect()
  }

  async disconnect () {
    this.network.providers.ethereum.selected.dissconect()
  }

  async _import ({ address, data, type, name}) {
    if (!data) return await this.accounts.add(address)
  }

  _subscribeToStates () {
    this.transactions.state.on('update', (state) => {
      this.state.updateState({ transactions: state })
    })
    this.network.state.on('update', (state) => {
      this.state.updateState({ networks: state })
    })
  }
}

export { connectToBackgroundApi } from './lib/connect'

export default async function startApi() {
  const rawState = await getPersistedState(STATE_KEY)
  const newVersionState = await migrate(rawState)
  persistState(STATE_KEY, newVersionState)
  const main = new Main(newVersionState.state)
  return { main }
}
