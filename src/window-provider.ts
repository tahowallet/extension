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
      providers: [...(window.ethereum ? [window.ethereum] : [])],
      switchToPreviousProvider() {
        const previousProvider = this.providers.pop()
        if (previousProvider) {
          this.providers.push(this.currentProvider)
          this.currentProvider = previousProvider
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
        const previousProvider = this.currentProvider
        this.currentProvider = this.providers[providerIdex]
        this.providers.splice(providerIdex, 1)
        this.providers.push(previousProvider)
      },
      addProvider(newProvider: WalletProvider) {
        this.providers.push(newProvider)
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
