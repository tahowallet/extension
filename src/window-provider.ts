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
      previousProvider: window.ethereum,
      providers: [
        // deduplicate the providers array: https://medium.com/@jakubsynowiec/unique-array-values-in-javascript-7c932682766c
        ...new Set([
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
      switchToPreviousProvider() {
        if (this.previousProvider) {
          const tempPreviousProvider = this.previousProvider
          this.previousProvider = this.currentProvider
          this.currentProvider = tempPreviousProvider
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
      hasProvider(checkIdentity: (provider: WalletProvider) => boolean) {
        return this.providers.some(checkIdentity)
      },
      setCurrentProvider(checkIdentity: (provider: WalletProvider) => boolean) {
        if (!this.hasProvider(checkIdentity)) {
          throw new Error(
            "The given identity did not match to any of the recognized providers!"
          )
        }
        const providerIdex = this.providers.findIndex(checkIdentity)
        this.previousProvider = this.currentProvider
        this.currentProvider = this.providers[providerIdex]
      },
      addProvider(newProvider: WalletProvider) {
        this.providers.push(newProvider)
        this.previousProvider = newProvider
      },
    },
    writable: false,
    configurable: false,
  })
}

Object.defineProperty(window, "ethereum", {
  get() {
    return window.walletRouter?.currentProvider || window.tally
  },
  set(newProvider) {
    window.walletRouter?.addProvider(newProvider)
  },
  configurable: false,
})
