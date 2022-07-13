import browser from "webextension-polyfill"
import {
  EXTERNAL_PORT_NAME,
  PROVIDER_BRIDGE_TARGET,
  WINDOW_PROVIDER_TARGET,
} from "@tallyho/provider-bridge-shared"

const windowOriginAtLoadTime = window.location.origin

const INJECTED_WINDOW_PROVIDER_SOURCE = "@@@WINDOW_PROVIDER@@@"

export function connectProviderBridge(): void {
  const port = browser.runtime.connect({ name: EXTERNAL_PORT_NAME })
  window.addEventListener("message", (event) => {
    if (
      event.origin === windowOriginAtLoadTime && // we want to recieve msgs only from the in-page script
      event.source === window && // we want to recieve msgs only from the in-page script
      event.data.target === PROVIDER_BRIDGE_TARGET
    ) {
      // TODO: replace with better logging before v1. Now it's invaluable in debugging.
      // eslint-disable-next-line no-console
      console.log(
        `%c content: inpage > background: ${JSON.stringify(event.data)}`,
        "background: #bada55; color: #222"
      )

      port.postMessage(event.data)
    }
  })

  port.onMessage.addListener((data) => {
    // TODO: replace with better logging before v1. Now it's invaluable in debugging.
    // eslint-disable-next-line no-console
    console.log(
      `%c content: background > inpage: ${JSON.stringify(data)}`,
      "background: #222; color: #bada55"
    )
    window.postMessage(
      {
        ...data,
        target: WINDOW_PROVIDER_TARGET,
      },
      windowOriginAtLoadTime
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

export function injectTallyWindowProvider(): void {
  try {
    const container = document.head || document.documentElement
    const scriptTag = document.createElement("script")
    // this makes the script loading blocking which is good for us
    // bc we want to load before anybody has a chance to temper w/ the window obj
    scriptTag.setAttribute("async", "false")
    scriptTag.textContent = INJECTED_WINDOW_PROVIDER_SOURCE

    container.insertBefore(scriptTag, container.children[0])
  } catch (e) {
    throw new Error(
      `Tally: oh nos the content-script failed to initilaize the Tally window provider.
        ${e}
        It's time for a seppuku...🗡`
    )
  }
}
