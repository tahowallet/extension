/// <reference types="styled-jsx" />

// Although you would expect this file to be unnecessary, removing it will
// result in a handful of type errors. See PR #196.

declare module "styled-jsx/style"

type WalletProvider = {
  on: (
    eventName: string | symbol,
    listener: (...args: unknown[]) => void
  ) => unknown
  removeListener: (
    eventName: string | symbol,
    listener: (...args: unknown[]) => void
  ) => unknown
}

type WindowEthereum = WalletProvider & {
  isMetaMask?: boolean
  isTally?: boolean
  autoRefreshOnNetworkChange?: boolean
}
interface Window {
  walletRouter?: {
    currentProvider: WalletProvider
    providers: WalletProvider[]
  }
  tally?: WalletProvider & {
    isTally: boolean
  }
  ethereum?: WindowEthereum
  oldEthereum?: WindowEthereum
}
