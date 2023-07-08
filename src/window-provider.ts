import {
  RequestArgument,
  WindowListener,
  WindowRequestEvent,
} from "@tallyho/provider-bridge-shared"
import TahoWindowProvider from "@tallyho/window-provider"

const tahoWindowProvider: TahoProvider = new TahoWindowProvider({
  postMessage: (data: WindowRequestEvent) =>
    window.postMessage(data, window.location.origin),
  addEventListener: (fn: WindowListener) =>
    window.addEventListener("message", fn, false),
  removeEventListener: (fn: WindowListener) =>
    window.removeEventListener("message", fn, false),
  origin: window.location.origin,
})

function defaultManageProvider(provider: WalletProvider): WalletProvider {
  if (
    // Rewrap MetaMask in a proxy that will route to Taho whenever Taho is
    // default.
    provider.isMetaMask === true &&
    Object.keys(provider).filter((key) => key.startsWith("is")).length === 1
  ) {
    return new Proxy(provider, {
      get(target, prop, receiver) {
        if (
          window.walletRouter &&
          window.walletRouter.currentProvider === tahoWindowProvider &&
          tahoWindowProvider.tahoSetAsDefault &&
          prop in tahoWindowProvider
        ) {
          return Reflect.get(
            // Always proxy to the current provider, even if it has changed. This
            // allows changes in the current provider, particularly when the user
            // changes their default wallet, to take effect immediately. Combined
            // with walletRouter.routeToNewNonTahoDefault, this allows Taho to
            // effect a change in provider without a page reload or even a second
            // attempt at connecting.
            tahoWindowProvider,
            prop,
            receiver
          )
        }

        return Reflect.get(target, prop, receiver)
      },
    })
  }

  return provider
}

function defaultManageProviders(providers: WalletProvider[]): WalletProvider[] {
  return providers.map(defaultManageProvider)
}

// The window object is considered unsafe, because other extensions could have modified them before this script is run.
// For 100% certainty we could create an iframe here, store the references and then destoroy the iframe.
//   something like this: https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=95
Object.defineProperty(window, "tally", {
  value: tahoWindowProvider,
  writable: false,
  configurable: false,
})

if (!window.walletRouter) {
  const existingProviders =
    window.ethereum !== undefined && Array.isArray(window.ethereum?.providers)
      ? defaultManageProviders(window.ethereum.providers)
      : [window.ethereum]

  const dedupedProviders = [
    ...new Set([tahoWindowProvider, ...existingProviders]),
  ].filter((item) => item !== undefined)

  Object.defineProperty(window, "walletRouter", {
    value: {
      currentProvider: window.tally,
      lastInjectedProvider: window.ethereum,
      tallyProvider: window.tally,
      providers: dedupedProviders,
      shouldSetTallyForCurrentProvider(
        shouldSetTally: boolean,
        shouldReload = false
      ) {
        if (shouldSetTally && this.currentProvider !== this.tallyProvider) {
          this.currentProvider = this.tallyProvider
        } else if (
          !shouldSetTally &&
          this.currentProvider === this.tallyProvider
        ) {
          this.currentProvider = this.lastInjectedProvider ?? this.tallyProvider
        }

        if (
          shouldReload &&
          (window.location.href.includes("app.uniswap.org") ||
            window.location.href.includes("galxe.com"))
        ) {
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      },
      routeToNewNonTahoDefault(
        request: Required<RequestArgument>
      ): Promise<unknown> {
        // Don't route to a new default if it's Taho. This avoids situations
        // where Taho is default, then default is turned off, but no other
        // provider is installed, so that we don't try to reroute back to Taho
        // as the only other provider.
        if (this.currentProvider === this.tallyProvider) {
          return Promise.reject(
            new Error("Only the Taho provider is installed.")
          )
        }
        return this.currentProvider.request(request)
      },
      getProviderInfo(provider: WalletProvider) {
        return (
          provider.providerInfo || {
            label: "Injected Provider",
            injectedNamespace: "ethereum",
            iconURL: "TODO",
          }
        )
      },
      setSelectedProvider() {},
      addProvider(newProvider: WalletProvider) {
        if (!this.providers.includes(newProvider)) {
          this.providers.push(defaultManageProvider(newProvider))
        }

        this.lastInjectedProvider = newProvider
      },
    },
    writable: false,
    configurable: false,
  })
}

// Some popular dapps depend on the entire window.ethereum equality between component renders
// to detect provider changes.  We need to cache the walletRouter proxy we return here or
// these dapps may incorrectly detect changes in the provider where there are none.
let cachedWindowEthereumProxy: WindowEthereum

// We need to save the current provider at the time we cache the proxy object,
// so we can recognize when the default wallet behavior is changed. When the
// default wallet is changed we are switching the underlying provider.
let cachedCurrentProvider: WalletProvider

Object.defineProperty(window, "ethereum", {
  get() {
    if (!window.walletRouter) {
      throw new Error(
        "window.walletRouter is expected to be set to change the injected provider on window.ethereum."
      )
    }
    if (
      cachedWindowEthereumProxy &&
      cachedCurrentProvider === window.walletRouter.currentProvider
    ) {
      return cachedWindowEthereumProxy
    }

    if (window.walletRouter.currentProvider === undefined) {
      return undefined
    }

    cachedWindowEthereumProxy = new Proxy(window.walletRouter.currentProvider, {
      get(target, prop, receiver) {
        if (
          window.walletRouter &&
          !(prop in window.walletRouter.currentProvider) &&
          prop in window.walletRouter
        ) {
          // let's publish the api of `window.walletRoute` also on `window.ethereum` for better discoverability

          // @ts-expect-error ts accepts symbols as index only from 4.4
          // https://stackoverflow.com/questions/59118271/using-symbol-as-object-key-type-in-typescript
          return window.walletRouter[prop]
        }

        return Reflect.get(
          // Always proxy to the current provider, even if it has changed. This
          // allows changes in the current provider, particularly when the user
          // changes their default wallet, to take effect immediately. Combined
          // with walletRouter.routeToNewNonTahoDefault, this allows Taho to
          // effect a change in provider without a page reload or even a second
          // attempt at connecting.
          window.walletRouter?.currentProvider ?? target,
          prop,
          receiver
        )
      },
    })
    cachedCurrentProvider = window.walletRouter.currentProvider

    return cachedWindowEthereumProxy
  },
  set(newProvider) {
    window.walletRouter?.addProvider(newProvider)
  },
  configurable: false,
})
