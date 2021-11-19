const PROVIDER_BRIDGE_TARGET = "tally-provider-bridge"
const WINDOW_PROVIDER_TARGET = "tally-window-provider"

// it's better to have our own copy of these functions so nobody
// can temper w / them in any way we would not want to
// (lot of script does this kind of magic eg ads logging)
// An extenstion before us in the runing queue still can modify these fns
// so it's not 100% safe but safe enough (for 100% iframe trick is necessary)
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
