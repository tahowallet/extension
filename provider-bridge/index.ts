import browser from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
  isObject,
} from "@tallyho/provider-bridge-shared"

const windowOriginAtLoadTime = window.location.origin

// eslint-disable-next-line import/prefer-default-export
export function connectProviderBridge(): void {
  const port = browser.runtime.connect({ name: EXTERNAL_PORT_NAME })
  window.addEventListener("message", (event) => {
    if (
      event.origin === windowOriginAtLoadTime && // we want to recieve msgs only from the in-page script
      event.source === window && // we want to recieve msgs only from the in-page script
      event.data.target === PROVIDER_BRIDGE_TARGET
    ) {
      // if dapp wants to connect let's grab its details
      if (
        event.data.request.method === "eth_requestAccounts" ||
        event.data.request.method === "wallet_requestPermissions" ||
        event.data.request.method === "wallet_addEthereumChain"
      ) {
        const faviconElements: NodeListOf<HTMLLinkElement> =
          window.document.querySelectorAll("link[rel*='icon']")
        const largestFavicon = [...faviconElements].sort((el) =>
          parseInt(el.sizes?.toString().split("x")[0], 10),
        )[0]
        const faviconUrl = largestFavicon?.href ?? ""
        const { title } = window.document ?? ""

        if (event.data.request.method === "eth_requestAccounts") {
          // For eth_requestAccounts specifically, we force the parameters as
          // the dApp should be sending none, but some send parameters that look
          // more like what you'd expect on wallet_requestPermissions.
          // eslint-disable-next-line no-param-reassign
          event.data.request.params = [title, faviconUrl]
        } else {
          event.data.request.params.push(title, faviconUrl)
        }
      }

      // TODO: replace with better logging before v1. Now it's invaluable in debugging.
      // eslint-disable-next-line no-console
      console.log(
        `%c content: inpage > background: ${JSON.stringify(event.data)}`,
        "background: #bada55; color: #222",
      )

      port.postMessage(event.data)
    }
  })

  port.onMessage.addListener((data) => {
    if (!isObject(data)) {
      return
    }
    // TODO: replace with better logging before v1. Now it's invaluable in debugging.
    // eslint-disable-next-line no-console
    console.log(
      `%c content: background > inpage: ${JSON.stringify(data)}`,
      "background: #222; color: #bada55",
    )
    window.postMessage(
      {
        ...data,
        target: WINDOW_PROVIDER_TARGET,
      },
      windowOriginAtLoadTime,
    )
  })

  // let's grab the internal config that also has chainId info
  // we send the config on port initialization, but that needs to
  // be as fast as possible, so we omit the chainId information
  // from that payload to save the service call
  port.postMessage({
    request: { method: "tally_getConfig", origin: windowOriginAtLoadTime },
  })
}
