/// <reference types="styled-jsx" />

declare module "webext-redux/lib/strategies/deepDiff/diff" {
  // This should be : DiffStrategy, but importing webext-redux to reuse
  // DiffStrategy results in an error augmenting the diff module.
  export default function (): (oldObj: unknown, newObj: unknown) => unknown
}

declare module "webext-redux/lib/strategies/deepDiff/patch" {
  // This should be : DiffStrategy, but importing webext-redux to reuse
  // DiffStrategy results in an error augmenting the patch module.
  export default function (): (oldObj: unknown, newObj: unknown) => unknown
}

// Although you would expect this file to be unnecessary, removing it will
// result in a handful of type errors. See PR #196.

declare module "styled-jsx/style"

type BaseWalletProvider = {
  providerInfo?: {
    label: string
    injectedNamespace: string
    iconURL: string
    identityFlag?: string
    checkIdentity?: (provider: WalletProvider) => boolean
  }
  emit: (eventName: string | symbol, ...args: unknown[]) => boolean
  on: (
    eventName: string | symbol,
    listener: (...args: unknown[]) => void
  ) => unknown
  removeListener: (
    eventName: string | symbol,
    listener: (...args: unknown[]) => void
  ) => unknown
}

type WalletProvider = BaseWalletProvider & {
  [optionalProps: string]: unknown
}

type TahoProvider = BaseWalletProvider & {
  isTally: true
  isTaho: true
  tahoSetAsDefault: boolean
  send: (method: string, params: unknown[]) => void | Promise<unknown>
}

type WindowEthereum = WalletProvider & {
  isMetaMask?: boolean
  tallySetAsDefault?: boolean
  tahoSetAsDefault?: boolean
  isTally?: boolean
  isTaho?: boolean
  autoRefreshOnNetworkChange?: boolean
}
interface Window {
  walletRouter?: {
    currentProvider: WalletProvider
    providers: WalletProvider[]
    shouldSetTallyForCurrentProvider: (
      shouldSetTaho: boolean,
      shouldReload?: boolean
    ) => void
    shouldSetTahoForCurrentProvider: (
      shouldSetTaho: boolean,
      shouldReload?: boolean
    ) => void
    routeToNewNonTahoDefault: (request: unknown) => Promise<unknown>
    reemitTahoEvent: (event: string | symbol, ...args: unknown[]) => boolean
    getProviderInfo: (
      provider: WalletProvider
    ) => WalletProvider["providerInfo"]
    addProvider: (newProvider: WalletProvider) => void
  }
  tally?: TahoProvider
  taho?: TahoProvider
  ethereum?: WindowEthereum
  oldEthereum?: WindowEthereum
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "production" | "development" | "test"
  }
}
