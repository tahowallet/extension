/// <reference types="styled-jsx" />

// Although you would expect this file to be unnecessary, removing it will
// result in a handful of type errors. See PR #196.

declare module "styled-jsx/style"
interface Window {
  tally?: {
    isTally: boolean
    on: (
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) => unknown
    removeListener: (
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) => unknown
  }
  ethereum?: {
    isMetaMask?: boolean
    isTally?: boolean
    on?: (
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) => unknown
    removeListener?: (
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) => unknown
    autoRefreshOnNetworkChange?: boolean
  }
  oldEthereum?: {
    isMetaMask?: boolean
    isTally?: boolean
    on?: (
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) => unknown
    removeListener?: (
      eventName: string | symbol,
      listener: (...args: any[]) => void
    ) => unknown
    autoRefreshOnNetworkChange?: boolean
  }
}
