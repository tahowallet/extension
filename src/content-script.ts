// could not come up w/ any way to have sane organisation for this file and satisfy this rule. pls hAlp :)
/* eslint @typescript-eslint/no-use-before-define: "off" */

const browserApi = getBrowserApi()

injectInpageScript().then((_) => {
  setupConnection()
})

// implementations

function setupConnection() {
  const port = browserApi.runtime.connect()

  window.addEventListener("message", (event) => {
    if (
      event.origin !== window.location.origin || // we want to recieve msgs only from the inpage script
      event.source !== window || // we want to recieve msgs only from the inpage script
      event.data.target !== "content" // TODO: needs a better solution
    )
      return
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: inpage > background: ${JSON.stringify(event.data)}`,
      "background: #bada55; color: #222"
    )

    port.postMessage(
      JSON.stringify({
        target: "background",
        source: event.data.target,
        message: `ping ${event.data.message}`,
      })
    )
  })

  port.onMessage.addListener((msg) => {
    const payload = JSON.parse(msg) // TODO try catch

    if (payload.target !== "content") return
    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log(
      `%c content: background > inpage: ${msg}`,
      "background: #222; color: #bada55"
    )
    window.postMessage(
      {
        target: "inpage",
        source: payload.target,
        message: `ACK ${payload.message}`,
      },
      window.location.origin
    )
  })
}

function injectInpageScript() {
  const baseUrl = browserApi.runtime.getURL("")
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
