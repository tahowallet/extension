import ObsStore from '../lib/ob-store'
import EthereumBalances  from './balances/ethereum'

/*
STATE
{
  accountsMetadata: [{ address: "...", ... }]
}
*/

interface AccountMetadata {
  [index: string]: any
  address: string
}

export type AccountsState = AccountMetadata[]

export default class Accounts {
  store: ObsStore<AccountsState>
  balances: EthereumBalances
  getTransactionHistory: any
  selectedAccount: AccountMetadata

  constructor (provider, getTransactionHistory, accounts : AccountsState) {
    this.balances = new EthereumBalances({ provider })
    this.getTransactionHistory = getTransactionHistory
    this.store =  new ObsStore<AccountsState>(accounts)
  }

  async get(_ : { address? : string }) {
    const { address } = _
    if (address) return this._getAccount(address)
    return this._getAccounts()
  }

  async add(newAccountData : AccountMetadata) {
    const accounts = this.store.getState()
    accounts.push(newAccountData)
    this.store.putState(accounts)
    return true
  }

  async _getAccounts() {
    return this.store.getState()
  }

  getAccountMetadata(address : string) {
    return this.store.getState()
    .find((account : any = {}) => account.address && account.address === address)
  }

  async _getAccount(address : string) : Promise<AccountMetadata>{
    const account = this.getAccountMetadata(address) || { address }
    const balances = await this.balances.get(address)
    // not availble yet
    // const fiatTotal = balances.reduce((fiatTotal, tokenBalance) => {
    //   return fiatTotal + ParseFloat(tokenBalance.fiatBalance)
    // }, 0)
    const activity = await this.getTransactionHistory(address)
    return {
      ...account,
      activity,
      tokens: balances,
      total_balance: {
        amount: balances[0].balance, // eth only for now
      }
    }
  }

  updateAccount(newAccountData : AccountMetadata) {
    const accounts = this.store.getState().map((account) => {
      if (account.address === newAccountData.address ) {
        return { ...account, ...newAccountData }
      }
      return account
    })
    this.store.putState(accounts)
  }

  async setSelectedAccount (account : AccountMetadata) {
    const { address } = account
    this.selectedAccount = await this._getAccount(address)
  }

  getSelectedAccount () {
    return this.selectedAccount
  }
}
