import ObsStore from '../lib/ob-store.js'
import EthereumBalances  from './balances/ethereum'

/*
STATE
{
  accountsMetaData: [{ address: "...", ... }]
}
*/

interface AccountMetadata {
  [index: string]: any
  address: string
}

export default class Accounts {
  store: ObsStore
  balances: EthereumBalances
  getTransactionHistory: any
  selectedAccount: AccountMetadata

  constructor ({ provider, getTransactionHistory, accountsMetaData }) {
    this.balances = new EthereumBalances({ provider })
    this.getTransactionHistory = getTransactionHistory
    this.store =  new ObsStore({ accountsMetaData })
  }

  async get(_ : { address? : string }) {
    const { address } = _
    if (address) return this._getAccount(address)
    return this._getAccounts()
  }

  async add(newAccountData) {
    const accounts = this.store.getState().accountsMetaData
    accounts.push(newAccountData)
    this.store.putState(newAccountData)
    return true
  }

  async _getAccounts() {
    return this.store.getState().accountsMetaData
  }

  getAccountMetaData(address : string) {
    return this.store.getState().accountsMetaData
    .find((account : any = {}) => account.address && account.address === address)
  }

  async _getAccount (address) : Promise<AccountMetadata>{
    const account = this.getAccountMetaData(address) || { address }
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

  updateAccount (newAccountData : AccountMetadata) {
    const accountsMetaData = this.store.getState().accountsMetaData.map((account) => {
      if (account.address === newAccountData.address ) {
        return { ...account, ...newAccountData}
      }
      return account
    })
    this.store.putState({ accountsMetaData })
  }

  async setSelectedAccount (account : AccountMetadata) {
    const { address } = account
    this.selectedAccount = await this._getAccount(address)
  }

  getSelectedAccount () {
    return this.selectedAccount
  }
}
