import {
  WindowListener,
  WindowRequestEvent,
} from "@tallyho/provider-bridge-shared"
import TallyWindowProvider from "@tallyho/window-provider"

// The window object is considered unsafe, because other extensions could have modified them before this script is run.
// For 100% certainty we could create an iframe here, store the references and then destoroy the iframe.
//   something like this: https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=95
Object.defineProperty(window, "tally", {
  value: new TallyWindowProvider({
    postMessage: (data: WindowRequestEvent) =>
      window.postMessage(data, window.location.origin),
    addEventListener: (fn: WindowListener) =>
      window.addEventListener("message", fn, false),
    removeEventListener: (fn: WindowListener) =>
      window.removeEventListener("message", fn, false),
    origin: window.location.origin,
  }),
  writable: false,
  configurable: false,
})

if (!window.walletRouter) {
  Object.defineProperty(window, "walletRouter", {
    value: {
      currentProvider: window.tally,
      lastInjectedProvider: window.ethereum,
      tallyProvider: window.tally,
      providers: [
        // deduplicate the providers array: https://medium.com/@jakubsynowiec/unique-array-values-in-javascript-7c932682766c
        ...new Set([
          window.tally,
          // eslint-disable-next-line no-nested-ternary
          ...(window.ethereum
            ? // let's use the providers that has already been registered
              // This format is used by coinbase wallet
              Array.isArray(window.ethereum.providers)
              ? [...window.ethereum.providers, window.ethereum]
              : [window.ethereum]
            : []),
          window.tally,
        ]),
      ],
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
            window.location.href.includes("galaxy.eco"))
        ) {
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
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
      addProvider(newProvider: WalletProvider) {
        if (!this.providers.includes(newProvider)) {
          this.providers.push(newProvider)
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

    cachedWindowEthereumProxy = new Proxy(window.walletRouter.currentProvider, {
      get(target, prop, receiver) {
        if (
          window.walletRouter &&
          !(prop in window.walletRouter.currentProvider) &&
          prop in window.walletRouter
        ) {
          // Uniswap MM connector checks the providers array for the MM provider and forces to use that
          // https://github.com/Uniswap/web3-react/blob/main/packages/metamask/src/index.ts#L57
          // as a workaround we need to remove this list for uniswap so the actual provider change can work after reload.
          // The same is true for `galaxy.eco`
          if (
            window.location.href.includes("app.uniswap.org") &&
            window.location.href.includes("galaxy.eco") &&
            prop === "providers"
          ) {
            return null
          }
          // let's publish the api of `window.walletRoute` also on `window.ethereum` for better discoverability

          // @ts-expect-error ts accepts symbols as index only from 4.4
          // https://stackoverflow.com/questions/59118271/using-symbol-as-object-key-type-in-typescript
          return window.walletRouter[prop]
        }

        return Reflect.get(target, prop, receiver)
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
