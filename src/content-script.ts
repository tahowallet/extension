// could not come up w/ any way to have sane organisation for this file and satisfy this rule. pls hAlp :)
/* eslint @typescript-eslint/no-use-before-define: "off" */

import { CONTENT_BACKGROUND_PORT } from "@tallyho/tally-background/constants"

const browserApi = getBrowserApi()

injectInpageScript()
setupConnection()

// implementations

function setupConnection() {
  const port = browserApi.runtime.connect({
    name: CONTENT_BACKGROUND_PORT,
  })

  setInterval(() => port.postMessage("ping"), 2000)

  port.onMessage.addListener((msg) => {
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log("content: bg msg received: ", msg)
  })
}

function injectInpageScript() {
  try {
    const container = document.head || document.documentElement
    const scriptTag = document.createElement("script")
    scriptTag.src = browserApi.runtime.getURL("inpage.js")
    container.insertBefore(scriptTag, container.children[0])
  } catch (e) {
    throw new Error(
      `Tally: oh nos the content-script failed to initilaize the inpage provider.
      ${e}
      It's time for a seppoku...🗡`
    )
  }
}

function getBrowserApi() {
  // did not want to include the webextension polyfill as it makes this file huge 700B -> 3.3MB
  // and as this file get injected into all webpages this could result in significant slow down
  // and we don't use callback/promise apis so it would not give us any benefit
  let api

  if (window.chrome) {
    api = window.chrome
  } else {
    api = browser
  }

  if (!api) {
    throw new Error("Browser API is not present")
  }

  return api
}
