import browser from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
  isObject,
} from "@tallyho/provider-bridge-shared"

const windowOriginAtLoadTime = window.location.origin

export default function connectProviderBridge(): void {
  const port = browser.runtime.connect({ name: EXTERNAL_PORT_NAME })

  const onWindowMessageListener = (event: MessageEvent): void => {
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
  }

  const onPortMessageListener = (data: unknown): void => {
    if (!isObject(data)) {
      return
    }

    // TODO: replace with better logging before v1. Now it's invaluable in debugging.
    // eslint-disable-next-line no-console
    console.log(
      `%c content: background > inpage: ${JSON.stringify(data)}`,
      "background: #222; color: #bada55",
    )
    if (typeof data !== "object") {
      // eslint-disable-next-line no-console
      console.error("Unexpected message on port listener", data)
    }
    window.postMessage(
      {
        ...(data as Record<string, unknown>),
        target: WINDOW_PROVIDER_TARGET,
      },
      windowOriginAtLoadTime,
    )
  }

  window.addEventListener("message", onWindowMessageListener)

  port.onMessage.addListener(onPortMessageListener)

  port.onDisconnect.addListener(() => {
    window.removeEventListener("message", onWindowMessageListener)
    port.onMessage.removeListener(onPortMessageListener)

    // Log this for debugging
    // eslint-disable-next-line no-console
    console.log("Reconnecting port from contentScript")
    connectProviderBridge()
    window.dispatchEvent(new Event("tally:reconnectProvider"))
  })
  // let's grab the internal config that also has chainId info
  // we send the config on port initialization, but that needs to
  // be as fast as possible, so we omit the chainId information
  // from that payload to save the service call
  port.postMessage({
    id: "-1",
    request: { method: "tally_getConfig", origin: windowOriginAtLoadTime },
  })
}
