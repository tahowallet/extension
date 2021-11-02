// it's still possible to tamper w/ postMessage or addEventListener
// if some script gets loaded before our script (probably my a malicious extension)
// but is't not a probable attack vector
// TODO: somehow make sure to be the first to be loaded
// https://link.springer.com/article/10.1007/s10207-019-00481-8

// it's better to have our own copy of these functions so nobody
// can temper w / them in any way we would not want to
// (lot of script does this kind of magic eg ads logging)
const windowPostMessage = window.postMessage
const windowAddEventListener = window.addEventListener

// to demonstrate how it works it was necessary. Will remove later
// eslint-disable-next-line no-console
console.log("inpage.js in da house")

setInterval(() => {
  // ‼️ Always include target origin to avoid unwanted attention
  windowPostMessage(
    {
      target: "content",
      source: "inpage",
      message: "SYN",
    },
    window.location.origin
  )

  // to demonstrate how it works it was necessary. Will remove later
  // eslint-disable-next-line no-console
  console.log("-------------")
}, 3000)

windowAddEventListener("message", (event) => {
  if (
    event.origin !== window.location.origin || // we want to recieve msgs only from the inpage script
    event.source !== window || // we want to recieve msgs only from the inpage script
    event.data.target !== "inpage" // TODO: needs a better solution
  )
    return

  // to demonstrate how it works it was necessary. Will remove later
  // eslint-disable-next-line no-console
  console.log("inpage: ", event.data)
})
