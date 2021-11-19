const PROVIDER_BRIDGE_TARGET = "tally-provider-bridge"
const WINDOW_PROVIDER_TARGET = "tally-window-provider"

// We want our own functions to minimize tampering.
// We still consider them unsafe because there's no guarantee they weren't tampered with before we stored them.
// For 100% certainty we could create an iframe here, store the references and then destoroy the iframe.
//   something like this: https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=95
const unsafePostMessage = window.postMessage
const unsafeAddEventListener = window.addEventListener
const unsafeOrigin = window.location.origin

// to demonstrate how it works it was necessary. Will remove later
// eslint-disable-next-line no-console
console.log("inpage.js in da house", Date.now())

const WINDOW_PROVIDER_FLAG = "isTallyWindowProviderEnabled"

const enabled = window.localStorage.getItem(WINDOW_PROVIDER_FLAG)

if (enabled === "true") {
  setInterval(() => {
    // ‼️ Always include target origin to avoid unwanted attention
    unsafePostMessage(
      {
        target: PROVIDER_BRIDGE_TARGET,
        message: "SYN",
      },
      unsafeOrigin
    )

    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log("-------------")
  }, 1000)

  unsafeAddEventListener("message", (event) => {
    if (
      event.origin !== unsafeOrigin || // we want to recieve msgs only from the provider bridge
      event.source !== window || // we want to recieve msgs only from the provider bridge
      event.data.target !== WINDOW_PROVIDER_TARGET
    )
      return

    // to demonstrate how it works it was necessary. Will remove later
    // eslint-disable-next-line no-console
    console.log("inpage: ", event.data)
  })
}
