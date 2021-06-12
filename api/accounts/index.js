import ObsStore from '../lib/ob-store.js'

export default class Accounts {
  constructor ({ getTransactionHistory, balances, accountsMetaData = [] }) {
    this.balances = balances
    this.getTransactionHistory = getTransactionHistory
    this.store =  new ObsStore({ accountsMetaData })
  }

  async get({ address }) {
    if (address) return this.getAccount(address)
    return this._getAccounts()
  }

  async add (newAccountData) {
    const accounts = this.store.getState().accountsMetaData
    accounts.push(newAccountData)
    this.store.putState(newAccountData)
    return true
  }

  async _getAccounts (address) {
    return this.store.getState().accountsMetaData
  }

  getAccountMetaDate(address) {
    return this.store.getState().accountsMetaData
    .find(account => account.address === address)
  }

  async _getAccount (address) {
    account = this.getAccountMetaDate(address)
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
        currency: this.userPrefernces.getState().fiatDisplay
      }
    }

  }

  updateAccount (newAccountData) {
    const accountsMetaData = this.store.getState().accountsMetaData.map((account) => {
      if (account.address === newAccountData.address ) {
        return { ...account, ...newAccountData}
      }
      return account
    })
    this.store.putState({ accountsMetaData })
  }

  setSelctedAccount ({ address }) {
    this.selctedAccount = this.getAccount(address)
  }

  getSelctedAccount () {
    return this.selctedAccount
  }
}