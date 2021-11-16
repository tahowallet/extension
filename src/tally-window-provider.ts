// For design considerations see https://github.com/tallycash/tally-extension/blob/main/docs/inpage.md

// it's better to have our own copy of these functions so nobody
// can temper w / them in any way we would not want to
// (lot of script does this kind of magic eg ads logging)
const windowPostMessage = window.postMessage
const windowAddEventListener = window.addEventListener

// to demonstrate how it works it was necessary. Will remove later
// eslint-disable-next-line no-console
console.log("inpage.js in da house", Date.now())

setInterval(() => {
  // ‼️ Always include target origin to avoid unwanted attention
  windowPostMessage(
    {
      target: "tally-provider-bridge",
      message: "SYN",
    },
    window.location.origin
  )

  // to demonstrate how it works it was necessary. Will remove later
  // eslint-disable-next-line no-console
  console.log("-------------")
}, 1000)

windowAddEventListener("message", (event) => {
  if (
    event.origin !== window.location.origin || // we want to recieve msgs only from the provider bridge
    event.source !== window || // we want to recieve msgs only from the provider bridge
    event.data.target !== "tally-window-provider"
  )
    return

  // to demonstrate how it works it was necessary. Will remove later
  // eslint-disable-next-line no-console
  console.log("inpage: ", event.data)
})
