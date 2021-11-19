import browser from "webextension-polyfill"

export { browser }

const WINDOW_PROVIDER_TARGET = "tally-window-provider"
const PROVIDER_BRIDGE_TARGET = "tally-provider-bridge"

export function setupConnection() {
  const port = browser.runtime.connect()

  window.addEventListener("message", (event) => {
    if (
      event.origin !== window.location.origin || // we want to recieve msgs only from the in-page script
      event.source !== window || // we want to recieve msgs only from the in-page script
      event.data.target !== PROVIDER_BRIDGE_TARGET
    ) {
      return
    }

    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: inpage > background: ${JSON.stringify(event.data)}`,
      "background: #bada55; color: #222"
    )

    port.postMessage({
      message: `ping ${event.data.message}`,
    })
  })

  port.onMessage.addListener((payload) => {
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: background > inpage: ${JSON.stringify(payload)}`,
      "background: #222; color: #bada55"
    )
    window.postMessage(
      {
        target: WINDOW_PROVIDER_TARGET,
        message: `ACK ${payload.message}`,
      },
      window.location.origin
    )
  })
}

export function injectTallyWindowProvider() {
  return fetch(browser.runtime.getURL("window-provider.js"))
    .then((r) => r.text())
    .then((windowProviderSrc) => {
      try {
        const container = document.head || document.documentElement
        const scriptTag = document.createElement("script")
        // this makes the script loading blocking which is good for us
        // bc we want to load before anybody has a chance to temper w/ the window obj
        scriptTag.setAttribute("async", "false")
        // TODO: put env flag here so only dev env has sourcemaps
        scriptTag.textContent = windowProviderSrc.replace(
          "window-provider.js.map",
          browser.runtime.getURL("window-provider.js.map")
        )
        container.insertBefore(scriptTag, container.children[0])
      } catch (e) {
        throw new Error(
          `Tally: oh nos the content-script failed to initilaize the Tally window provider.
        ${e}
        It's time for a seppoku...🗡`
        )
      }
    })
}
