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

const tahoRoutedProperties = new Set<string>([
  "request",
  "isConnected",
  "enable",
  "send",
  "sendAsync",
  "on",
  "addListener",
  "removeListener",
  "removeAllListeners",
  "listeners",
  "listenerCount",
] satisfies (keyof TahoWindowProvider)[])

// Used exclusively if Taho is set to replace MetaMask AND MetaMask is not seen
// to be installed. In this case, we drop a MetaMask mock so that sites that
// only support MetaMask allow Taho connections; see the defaultManageProviders
// function below.
const metaMaskMock: WalletProvider = {
  isMetaMask: true,
  emit: (_: string | symbol, ...__: unknown[]) => false,
  on: () => {},
  removeListener: () => {},
  _metamask: {
    isUnlocked: () => {},
    requestBatch: () => {},
  },
  _state: {
    accounts: null,
    isConnected: false,
    isUnlocked: false,
    initialized: false,
    isPermanentlyDisconnected: false,
  },
}

// When doing development logging, used to associate timer logs with the final
// execution result.
let globalLoggingIndex = 0
/**
 * This function reflects the given prop off of the given reflectedObject. If
 * the prop is a function, it ensures that the underlying function is invoked
 * with the original `this` pointer. Finally, if the file was compiled in
 * development mode, it also inserts intercepting logging for introspection.
 */
function reflectRedirectAndDevLog(
  marker: string,
  reflectedObject: object,
  prop: string | symbol,
) {
  const reflected = Reflect.get(reflectedObject, prop, reflectedObject)

  if (process.env.NODE_ENV === "development") {
    if (typeof reflected === "function") {
      return (...args: unknown[]) => {
        const safeSerialize = (object: unknown) => {
          if (object instanceof Error) {
            return `${object.name}[${object.message}]${
              object.stack ? `: \n${object.stack}` : ""
            }`
          }

          try {
            return JSON.stringify(object)
          } catch (err) {
            return `${String(object)} (failed serialization due to ${
              err instanceof Error ? err.message : "an error"
            })`
          }
        }

        const loggingIndex = globalLoggingIndex
        globalLoggingIndex += 1
        const startTime = Date.now()
        const labelString = () =>
          `%c[${loggingIndex.toFixed(0).padStart(4, " ")},${(
            (Date.now() - startTime) /
            1000
          )
            .toFixed(2)
            .padStart(6, " ")}s] ${marker}.${String(prop)}: ${safeSerialize(
            args,
          )}`
        const timeLoggingInterval = setInterval(() => {
          // Logging for development purposes; should not appear on prod. t
          // prefix indicates this is a timing log rather than a completion
          // log.
          // eslint-disable-next-line no-console
          console.log(
            `t${labelString()}`,
            "color: #bada55; background-color: #222;",
          )
        }, 1000)

        try {
          const result = reflected.apply(reflectedObject, args)

          Promise.resolve(result)
            .then((succesfulResult) => {
              clearInterval(timeLoggingInterval)
              // Logging for development purposes; should not appear on prod.
              // eslint-disable-next-line no-console
              console.log(
                `${labelString()}%c -> ${safeSerialize(succesfulResult)}`,
                "background: #bada55; color: #222",
                "background: #222; color: #bada55",
              )
            })
            .catch((error) => {
              clearInterval(timeLoggingInterval)
              // Logging for development purposes; should not appear on prod.
              // eslint-disable-next-line no-console
              console.log(
                `${labelString()}%c -> ${safeSerialize(error)}`,
                "background: #bada55; color: #222",
                // Error -- red background.
                "background: #dd0000; color: #bada55",
              )
            })

          return result
        } catch (err) {
          clearInterval(timeLoggingInterval)

          // Logging for development purposes; should not appear on prod.
          // eslint-disable-next-line no-console
          console.log(
            `${labelString()}%c -> ${safeSerialize(err)}`,
            "background: #bada55; color: #222",
            // Error -- red background.
            "background: #dd0000; color: #bada55",
          )

          throw err
        }
      }
    }
  }

  if (typeof reflected === "function") {
    // In production mode, still wrap reflected functions to set the `this`
    // pointer to the reflected object.
    return (...args: unknown[]) => reflected.apply(reflectedObject, args)
  }

  return reflected
}
// A tracking list of MetaMask wrappers that allow us to avoid double-wrapping.
// The map key is the provider that *was wrapped*, i.e. the original, and the
// map value is the wrapping provider, i.e. the proxy that makes sure default
// settings are respected.
const metaMaskWrapperByWrappedProvider = new Map<
  WalletProvider,
  WalletProvider
>()
let metaMaskMockWrapper: WalletProvider | undefined

function wrapMetaMaskProvider(provider: WalletProvider): {
  provider: WalletProvider
  wasMetaMaskLike: boolean
} {
  if (metaMaskWrapperByWrappedProvider.has(provider)) {
    return {
      // `get` is guarded by the `has` check above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      provider: metaMaskWrapperByWrappedProvider.get(provider)!,
      wasMetaMaskLike: true,
    }
  }
  if (new Set(metaMaskWrapperByWrappedProvider.values()).has(provider)) {
    return { provider, wasMetaMaskLike: true }
  }

  if (
    // Rewrap MetaMask in a proxy that will route to Taho whenever Taho is
    // default.
    provider.isMetaMask === true &&
    Object.keys(provider).filter((key) => key.startsWith("is")).length === 1
  ) {
    const wrapper = new Proxy(provider, {
      get(target, prop) {
        if (
          window.walletRouter &&
          window.walletRouter.currentProvider === tahoWindowProvider &&
          tahoWindowProvider.tahoSetAsDefault &&
          tahoRoutedProperties.has(String(prop)) &&
          prop in tahoWindowProvider
        ) {
          return reflectRedirectAndDevLog(
            "TH",
            // Always proxy to the current provider, even if it has changed. This
            // allows changes in the current provider, particularly when the user
            // changes their default wallet, to take effect immediately. Combined
            // with walletRouter.routeToNewNonTahoDefault, this allows Taho to
            // effect a change in provider without a page reload or even a second
            // attempt at connecting.
            tahoWindowProvider,
            prop,
          )
        }

        return reflectRedirectAndDevLog("MM", target, prop)
      },
    })

    metaMaskWrapperByWrappedProvider.set(provider, wrapper)

    if (provider === metaMaskMock) {
      metaMaskMockWrapper = wrapper
    }

    return {
      provider: wrapper,
      wasMetaMaskLike: true,
    }
  }

  return { provider, wasMetaMaskLike: false }
}

/**
 * Returns the list of providers but with any providers that manifest as
 * MetaMask wrapped in the proxy from wrapMetaMaskProvider. If no MetaMask-like
 * provider is detected and Taho is currently set as default, also creates a
 * MetaMask mock that will allow dApps that only detect MetaMask to work with
 * Taho when it is set as default.
 */
function metaMaskWrappedProviders(
  providers: (WalletProvider | undefined)[],
): WalletProvider[] {
  const tahoIsDefault =
    window.walletRouter !== undefined &&
    window.walletRouter.currentProvider === tahoWindowProvider &&
    tahoWindowProvider.tahoSetAsDefault

  const { defaultManagedProviders, metaMaskDetected } = providers.reduce<{
    defaultManagedProviders: WalletProvider[]
    metaMaskDetected: boolean
  }>(
    // Shadowing as we're building up the final value extracted above.
    // eslint-disable-next-line @typescript-eslint/no-shadow
    ({ defaultManagedProviders, metaMaskDetected }, provider) => {
      if (provider === undefined) {
        return { defaultManagedProviders, metaMaskDetected }
      }

      // Filter out MetaMask mock if Taho has been flipped off from default.
      if (provider === metaMaskMockWrapper && !tahoIsDefault) {
        return { defaultManagedProviders, metaMaskDetected }
      }

      const { provider: defaultManaged, wasMetaMaskLike } =
        wrapMetaMaskProvider(provider)

      return {
        defaultManagedProviders: [...defaultManagedProviders, defaultManaged],
        metaMaskDetected: metaMaskDetected || wasMetaMaskLike,
      }
    },
    { defaultManagedProviders: [], metaMaskDetected: false },
  )

  if (!metaMaskDetected && tahoIsDefault) {
    const { provider: metaMaskMockProvider } =
      wrapMetaMaskProvider(metaMaskMock)
    return [metaMaskMockProvider, ...defaultManagedProviders]
  }

  return defaultManagedProviders
}

function setupProviderWrapper() {
  // The window object is considered unsafe, because other extensions could have modified them before this script is run.
  // For 100% certainty we could create an iframe here, store the references and then destoroy the iframe.
  //   something like this: https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=95
  Object.defineProperty(window, "tally", {
    value: tahoWindowProvider,
    writable: false,
    configurable: false,
  })
  Object.defineProperty(window, "taho", {
    value: tahoWindowProvider,
    writable: false,
    configurable: false,
  })

  if (!window.walletRouter) {
    const existingProviders =
      window.ethereum !== undefined && Array.isArray(window.ethereum?.providers)
        ? window.ethereum.providers
        : [window.ethereum]

    const dedupedProviders = [
      ...new Set([
        tahoWindowProvider,
        ...metaMaskWrappedProviders(existingProviders),
      ]),
    ].filter((item) => item !== undefined)

    const wrappedLastInjectedProvider: WalletProvider | undefined =
      window.ethereum === undefined
        ? undefined
        : wrapMetaMaskProvider(window.ethereum).provider

    Object.defineProperty(window, "walletRouter", {
      value: {
        currentProvider: window.taho,
        lastInjectedProvider: wrappedLastInjectedProvider,
        tallyProvider: window.taho,
        tahoProvider: window.taho,
        providers: dedupedProviders,
        shouldSetTallyForCurrentProvider(
          shouldSetTally: boolean,
          shouldReload = false,
        ) {
          this.shouldSetTahoForCurrentProvider(shouldSetTally, shouldReload)
        },
        shouldSetTahoForCurrentProvider(
          shouldSetTaho: boolean,
          shouldReload = false,
        ) {
          if (shouldSetTaho && this.currentProvider !== this.tahoProvider) {
            this.currentProvider = this.tahoProvider
          } else if (
            !shouldSetTaho &&
            this.currentProvider === this.tahoProvider
          ) {
            this.currentProvider =
              this.lastInjectedProvider ?? this.tahoProvider
          }

          // Make the new "current provider" first in the provider list. This
          // makes it so that frameworks like wagmi that rely on the first item
          // in the list being the default browser wallet correctly see either
          // Taho (when default) or not-Taho (when not default).
          this.providers = [
            this.currentProvider,
            ...metaMaskWrappedProviders(
              this.providers.filter(
                (provider: WalletProvider) => provider !== this.currentProvider,
              ),
            ),
          ]

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
          request: Required<RequestArgument>,
        ): Promise<unknown> {
          // Don't route to a new default if it's Taho. This avoids situations
          // where Taho is default, then default is turned off, but no other
          // provider is installed, so that we don't try to reroute back to Taho
          // as the only other provider.
          if (this.currentProvider === this.tahoProvider) {
            return Promise.reject(
              new Error("Only the Taho provider is installed."),
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
        reemitTahoEvent(event: string | symbol, ...args: unknown[]): boolean {
          if (
            this.currentProvider !== this.tahoProvider ||
            this.lastInjectedProvider === undefined ||
            this.currentProvider === this.lastInjectedProvider
          ) {
            return false
          }

          return this.lastInjectedProvider.emit(event, ...args)
        },
        setSelectedProvider() {},
        addProvider(newProvider: WalletProvider) {
          const wrappedProvider = wrapMetaMaskProvider(newProvider).provider
          if (
            !this.providers.includes(newProvider) &&
            !this.providers.includes(wrappedProvider)
          ) {
            this.providers.push(wrappedProvider)
          }

          this.lastInjectedProvider = wrappedProvider
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
          "window.walletRouter is expected to be set to change the injected provider on window.ethereum.",
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

      cachedWindowEthereumProxy = new Proxy(
        window.walletRouter.currentProvider,
        {
          get(target, prop) {
            if (
              window.walletRouter &&
              window.walletRouter.currentProvider === tahoWindowProvider &&
              tahoWindowProvider.tahoSetAsDefault &&
              (prop === "isMetaMask" || String(prop).startsWith("_"))
            ) {
              // For MetaMask-specific properties like isMetaMask, _metamask, and others,
              // return our mock values if Taho is installed and set as default.
              // The Taho provider itself will always return `false` for isMetaMask and
              // doesn't respond to other MetaMask-specific properties, as certain
              // dApps detect a wallet that declares MetaMask-like properties AND
              // isSomethingElse and disallow the behavior we're going for here.
              return metaMaskMock[String(prop)]
            }

            if (
              window.walletRouter &&
              !(prop in window.walletRouter.currentProvider) &&
              prop in window.walletRouter
            ) {
              // let's publish the api of `window.walletRouter` also on `window.ethereum` for better discoverability

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
              target,
            )
          },
        },
      )
      cachedCurrentProvider = window.walletRouter.currentProvider

      return cachedWindowEthereumProxy
    },
    set(newProvider) {
      window.walletRouter?.addProvider(newProvider)
    },
    configurable: false,
  })
}

function announceProvider() {
  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: Object.freeze({
        info: {
          uuid: "03a6752a-c1a0-4f73-818c-f516203a4aa9",
          name: "Taho",
          icon: "data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='8' width='68' height='69' rx='22' fill='%23EF9C32'/%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M65.2376 40.084C65.811 40.5494 66.1983 41.2052 66.3289 41.9321C66.3544 42.1436 66.3571 42.3572 66.3369 42.5693C66.2812 42.7366 66.2812 42.872 66.2812 43.0234C66.2346 43.317 66.1681 43.6071 66.082 43.8916C65.9064 44.4853 65.6375 45.0473 65.2854 45.5565C65.2195 45.6524 65.1355 45.7619 65.0776 45.8374C65.0586 45.8622 65.0424 45.8833 65.0306 45.899C65.0325 45.9106 65.0372 45.9274 65.0433 45.9489C65.0623 46.0159 65.0942 46.1287 65.0942 46.2734C65.1879 46.8553 65.2147 47.4459 65.1739 48.0339C65.095 49.17 64.8258 50.2848 64.3774 51.3317C63.9303 52.4264 63.2284 53.3986 62.3301 54.1676L62.2266 54.2552L62.0832 54.311C60.9725 54.7233 59.8329 55.0534 58.6738 55.2987C57.4812 55.577 56.2573 55.6976 55.0334 55.6572H54.9378H54.8263C52.2955 54.8426 49.683 54.3083 47.0357 54.064C46.3151 54.0146 45.599 53.9135 44.8929 53.7613C44.1768 53.5722 43.4743 53.3354 42.7899 53.0523C41.7223 52.6699 40.6314 52.356 39.5239 52.1124C39.0032 52.8399 38.7627 53.731 38.8468 54.6216C38.9257 55.6021 39.8091 57.2891 40.4419 58.4974C40.5751 58.7519 40.6973 58.9851 40.7984 59.1861C41.5104 60.7652 41.769 62.5112 41.5454 64.2289C41.3217 65.9466 40.6245 67.5682 39.5319 68.9124C37.8078 65.3074 34.5751 63.5965 31.6802 62.0643C27.5132 59.8589 24.0462 58.0239 26.7865 51.4433C27.5615 49.5187 28.041 47.4033 28.4337 45.6706C28.7675 44.1976 29.0387 43.0012 29.3754 42.4339V42.4817C29.1515 43.7999 29.1515 45.1464 29.3754 46.4646C29.4803 47.0824 29.7137 47.6713 30.0605 48.1932C30.4214 48.6687 30.9065 49.0353 31.4625 49.2527C32.664 49.7285 33.9327 50.0134 35.2223 50.097C35.8835 50.1926 36.5446 50.1926 37.2137 50.1926H37.2138C37.5675 50.1899 37.9212 50.2058 38.2733 50.2404C38.6238 50.2723 38.9822 50.3121 39.3327 50.3679C40.7222 50.5923 42.0914 50.9279 43.4271 51.3716C44.6264 51.8475 45.8978 52.1169 47.187 52.1681C49.9272 52.3828 52.6327 52.9175 55.2485 53.7613C56.295 53.7974 57.3422 53.7173 58.3711 53.5223C58.6294 53.4729 58.884 53.4158 59.1373 53.359C59.2512 53.3335 59.3648 53.3081 59.4783 53.2834C61.2707 52.7576 63.3179 49.9776 60.9759 50.2404C60.3256 50.271 59.6785 50.3508 59.0402 50.4794C58.4622 50.5974 58.0084 50.7056 57.6254 50.797C56.4566 51.0758 55.9473 51.1973 54.5793 50.9573C53.6136 50.6227 52.6103 50.4087 51.5921 50.3201C52.4452 49.7712 53.4578 49.5243 54.4678 49.6191C55.214 49.7134 55.9708 49.6811 56.7062 49.5235C57.0775 49.4174 57.4562 49.2132 57.8654 48.9925C58.1935 48.8156 58.5413 48.628 58.9207 48.472C60.0017 48.1312 61.1341 47.9829 62.2664 48.0339C62.5489 47.7364 62.7575 47.3766 62.8751 46.9836C62.9927 46.5906 63.0161 46.1753 62.9435 45.7715C62.7145 45.4234 62.3659 45.1713 61.9637 45.0626C61.8051 45.0275 61.6034 44.9884 61.373 44.9437C60.1912 44.7144 58.2522 44.3381 57.4789 43.6049C56.9452 43.095 56.6584 41.5417 58.5384 41.1115C59.5323 40.9366 60.5458 40.9018 61.5494 41.008C61.9796 41.0558 63.1506 41.1673 63.4214 40.9442C63.2389 40.3118 61.1749 39.1819 59.1199 38.0569C57.318 37.0705 55.5231 36.0879 55.0095 35.4478C52.7222 33.1171 50.8018 30.4527 49.3139 27.5457C48.8315 26.3302 47.9185 25.3348 46.7489 24.7497C48.1385 24.648 49.5168 25.0621 50.6203 25.9127C50.7796 26.0448 50.9825 26.4068 51.2424 26.8707C51.9704 28.1698 53.1459 30.2675 55.0653 30.3497C55.2675 30.3691 55.4712 30.3333 55.6547 30.2461C54.7049 29.3501 54.0634 28.2691 53.4625 27.2567C52.5517 25.7219 51.7345 24.3449 50.0786 24.0089C50.0537 23.9991 50.029 23.9894 50.0043 23.9797C49.6263 23.8317 49.2721 23.693 48.8758 23.4911L47.7526 22.9335L45.5222 21.8501C44.0502 21.1388 42.5336 20.5241 40.9817 20.01C39.4466 19.5059 37.8636 19.1615 36.2579 18.9824C35.9074 18.9426 35.4374 18.8948 35.1108 18.8948C34.8032 18.8958 34.5003 18.9695 34.2266 19.1099C34.0365 19.1895 33.8193 19.301 33.6011 19.4131C33.4262 19.5029 33.2505 19.5931 33.0875 19.6675C33.0169 19.6997 32.9459 19.732 32.8749 19.7643C32.5773 19.8996 32.2776 20.0358 31.9882 20.1773C30.5328 20.8815 29.1596 21.7444 27.8937 22.7503C26.944 23.4205 26.1099 24.2411 25.4243 25.1799C26.6218 25.093 27.8245 25.2474 28.9612 25.6339C27.2342 25.7165 25.542 26.1497 23.9877 26.907C22.4334 27.6643 21.0494 28.7299 19.92 30.039C17.8728 32.2296 16.2796 43.4057 18.5976 46.3611C19.7293 45.8313 21.2594 43.2426 22.9982 40.3009C25.6778 35.7674 28.8529 30.3955 31.8289 30.4293C30.0366 32.0305 28.6505 36.332 27.2645 41.1514C26.1492 45.0626 22.3654 53.9843 19.9757 54.1994C19.0437 54.2552 18.7012 53.8091 18.0719 52.901L17.5461 52.1841C16.6271 50.9067 15.9272 49.4853 15.475 47.9781C15.0576 46.5025 14.8064 44.9849 14.7262 43.4535C14.6451 41.9475 14.6798 40.4376 14.8298 38.9369C14.9914 37.4496 15.2414 35.9733 15.5786 34.5158C15.9141 33.057 16.348 31.6226 16.877 30.2223C17.0204 29.8638 17.1638 29.5133 17.347 29.1548C17.44 28.954 17.5464 28.7597 17.6656 28.5733C17.8026 28.3862 17.9545 28.2103 18.1197 28.0476C18.7009 27.495 19.3581 27.0282 20.0713 26.6615C21.1149 26.1172 22.2267 25.7153 23.3771 25.4666C23.7408 24.6511 24.239 23.9025 24.8508 23.2521C25.456 22.6182 26.1142 22.0372 26.8184 21.5156C28.1687 20.4451 29.6326 19.5261 31.1836 18.7753C31.5501 18.5841 32.028 18.3691 32.3467 18.2336C32.5149 18.1621 32.6921 18.0706 32.8875 17.9697C33.0621 17.8795 33.2514 17.7817 33.4619 17.684C33.9375 17.4578 34.4567 17.3382 34.9834 17.3335C35.4338 17.3347 35.8835 17.3667 36.3296 17.4291C38.0438 17.6162 39.7338 17.982 41.372 18.5204C42.985 19.0582 44.5627 19.6967 46.0957 20.4322L48.358 21.5315L49.4812 22.0891C49.7556 22.2374 50.1059 22.3719 50.4871 22.5183C50.5154 22.5292 50.5439 22.5401 50.5725 22.5511C50.9868 22.7105 51.3691 22.8777 51.7834 23.0848C52.0073 23.1996 52.2229 23.3301 52.4286 23.4752C52.6245 23.6337 52.8107 23.804 52.9862 23.985C53.5962 24.6486 54.1305 25.3779 54.5793 26.1597C54.6289 26.2462 54.6781 26.3324 54.7272 26.4183C55.5132 27.795 56.2436 29.0741 57.3833 29.824L58.1799 30.3497C58.1662 30.3941 58.1475 30.4369 58.1241 30.4771L57.9569 30.7878L57.1603 31.1941C57.0024 31.2704 56.8798 31.4044 56.8177 31.5685C56.7881 31.642 56.7719 31.7202 56.7699 31.7995V32.3093C56.774 32.5784 56.7392 32.8467 56.6664 33.1059C56.6338 33.2102 56.5959 33.3024 56.5625 33.3838C56.5142 33.5014 56.4752 33.5961 56.4752 33.6715C56.4524 33.7522 56.4524 33.8377 56.4752 33.9184C56.6996 34.9283 59.6374 36.6256 62.0636 38.0273C63.5987 38.9141 64.9289 39.6827 65.2376 40.084ZM45.5857 33.0819C45.6734 34.1892 44.3271 35.0575 42.7339 35.2407C40.6867 35.4398 39.6512 34.3166 39.8822 32.8987C40.1132 31.4808 39.1174 31.4808 38.4483 32.2774C38.4335 32.2966 38.4128 32.3104 38.3894 32.3167C38.366 32.3231 38.3412 32.3217 38.3187 32.3127C38.2962 32.3037 38.2772 32.2876 38.2647 32.2669C38.2521 32.2461 38.2467 32.2218 38.2492 32.1977C38.5837 29.8319 39.9698 29.7283 40.5911 29.7283C42.4601 29.861 44.3116 30.1759 46.1194 30.6683C46.1697 30.6805 46.2156 30.7065 46.2519 30.7433C46.2883 30.7802 46.3137 30.8264 46.3252 30.8768C46.3368 30.9273 46.3341 30.9799 46.3175 31.0289C46.3008 31.0779 46.2709 31.1213 46.231 31.1542C45.9616 31.389 45.7597 31.6915 45.6463 32.0304C45.5329 32.3692 45.512 32.7323 45.5857 33.0819Z' fill='%23002825'/%3E%3C/svg%3E%0A",
          rdns: "xyz.taho.wallet",
        },
        provider: tahoWindowProvider,
      }),
    }),
  )
}

function injectProvider(): void {
  // Prevents loading the wallet provider in XML docs
  if (document.contentType !== "text/html") {
    return
  }

  setupProviderWrapper()
}

injectProvider()
window.addEventListener("eip6963:requestProvider", announceProvider)
announceProvider()
