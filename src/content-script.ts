// For design considerations see https://github.com/tallycash/tally-extension/blob/main/docs/inpage.md

// could not come up w/ any way to have sane organisation for this file and satisfy this rule. pls hAlp :)
/* eslint @typescript-eslint/no-use-before-define: "off" */

import browser from "webextension-polyfill"

injectInpageScript().then(() => {
  setupConnection()
})

// implementations

function setupConnection() {
  const port = browser.runtime.connect()

  window.addEventListener("message", (event) => {
    if (
      event.origin !== window.location.origin || // we want to recieve msgs only from the inpage script
      event.source !== window || // we want to recieve msgs only from the inpage script
      event.data.target !== "tally-content" // TODO: needs a better solution
    )
      return
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: inpage > background: ${JSON.stringify(event.data)}`,
      "background: #bada55; color: #222"
    )

    port.postMessage({
      target: "tally-content-script-service",
      message: `ping ${event.data.message}`,
    })
  })

  port.onMessage.addListener((payload) => {
    if (payload.target !== "tally-content") return
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: background > inpage: ${JSON.stringify(payload)}`,
      "background: #222; color: #bada55"
    )
    window.postMessage(
      {
        target: "tally-inpage",
        message: `ACK ${payload.message}`,
      },
      window.location.origin
    )
  })
}

function injectInpageScript() {
  const baseUrl = browser.runtime.getURL("")
  return fetch(`${baseUrl}inpage.js`)
    .then((r) => r.text())
    .then((inpageSrc) => {
      try {
        const container = document.head || document.documentElement
        const scriptTag = document.createElement("script")
        // this makes the script loading blocking which is good for us
        // bc we want to load before anybody has a chance to temper w/ the window obj
        scriptTag.setAttribute("async", "false")
        // TODO: put env flag here so only dev env has sourcemaps
        scriptTag.textContent = inpageSrc.replace(
          "inpage.js.map",
          `${baseUrl}inpage.js.map`
        )
        container.insertBefore(scriptTag, container.children[0])
        container.removeChild(scriptTag) // nah, we don't need anybody to read the source
      } catch (e) {
        throw new Error(
          `Tally: oh nos the content-script failed to initilaize the inpage provider.
        ${e}
        It's time for a seppoku...🗡`
        )
      }
    })
}
