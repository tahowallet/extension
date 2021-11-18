// For design considerations see https://github.com/tallycash/tally-extension/blob/main/docs/inpage.md

// could not come up w/ any way to have sane organisation for this file and satisfy this rule. pls hAlp :)
/* eslint @typescript-eslint/no-use-before-define: "off" */

import browser from "webextension-polyfill"

export { browser }

export function setupConnection() {
  const port = browser.runtime.connect()

  window.addEventListener("message", (event) => {
    if (
      event.origin !== window.location.origin || // we want to recieve msgs only from the in-page script
      event.source !== window || // we want to recieve msgs only from the in-page script
      event.data.target !== "tally-provider-bridge"
    )
      return
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: inpage > background: ${JSON.stringify(event.data)}`,
      "background: #bada55; color: #222"
    )

    port.postMessage({
      id: event.data.id,
      target: "tally-provider-bridge-service",
      payload: event.data.payload,
    })
  })

  port.onMessage.addListener((data) => {
    if (data.target !== "tally-provider-bridge") return
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: background > inpage: ${JSON.stringify(data)}`,
      "background: #222; color: #bada55"
    )
    window.postMessage(
      {
        id: data.id,
        target: "tally-window-provider",
        payload: data.payload,
      },
      window.location.origin
    )
  })
}

export function injectTallyWindowProvider() {
  const baseUrl = browser.runtime.getURL("")
  return fetch(`${baseUrl}window-provider.js`)
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
          `${baseUrl}window-provider.js.map`
        )
        container.insertBefore(scriptTag, container.children[0])
        container.removeChild(scriptTag) // nah, we don't need anybody to read the source
      } catch (e) {
        throw new Error(
          `Tally: oh nos the content-script failed to initilaize the Tally window provider.
        ${e}
        It's time for a seppoku...🗡`
        )
      }
    })
}
