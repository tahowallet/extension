import ObsStore from '../../lib/ob-store'

export default class Accounts {
  constructor ({ getTransactionHistory, balances, accountMetaData }) {
    this.balances = balances
    this.getTransactionHistory = getTransactionHistory
    this.store =  new ObsStore({ accountMetaData })
  }

  getApi () {
    return {
      getAccounts: this.getAccounts.bind(this),
      updateAccount: this.updateAccount.bind(this),
      getAccount: this.getAccount.bind(this),
      updateSelctedAccount: this.setSelctedAccount.bind(this),
      getSelctedAccount: this.getSelctedAccount.bind(this),
    }
  }

  getAccounts (address) {
    return this.store.getState().accountMetaData
  }

  getAccountMetaDate(address) {
    return this.store.getState().accountMetaData
    .find(account => account.address === address)
  }

  async getAccount (address) {
    account = this.getAccountMetaDate(address)
    const balances = await this.balances.get(address)
    const fiatTotal = balances.reduce((fiatTotal, tokenBalance) => {
      return fiatTotal + ParseFloat(tokenBalance.fiatBalance)
    }, 0)
    const activity = await this.getTransactionHistory(address)
    return {
      ...account,
      tokens: balances,
      total_balance: {
        amount: fiatTotal,
        currency: this.userPrefernces.getState().fiatDisplay
      }
    }

  }

  updateAccount (newAccountData) {
    let found
    const accountMetaData = this.store.getState().accountMetaData.map((account) => {
      if (account.address === newAccountData.address ) {
        found = true
        return { ...account, ...newAccountData}
      }
      return account
    })
    this.store.putState({ accountMetaData })
  }

  setSelctedAccount (address) {
    this.selctedAccount = this.getAccount(address)
  }

  getSelctedAccount () {
    return this.selctedAccount
  }
}