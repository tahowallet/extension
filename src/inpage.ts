// TODO: save used references to avoid using tempared functions
// TODO: somehow make sure to be the first to be loaded https://link.springer.com/article/10.1007/s10207-019-00481-8

// to demonstrate how it works it was necessary. Will remove later
// eslint-disable-next-line no-console
console.log("inpage.js in da house")

setInterval(() => {
  // ‼️ Alway include target orgiin to avoid unwanted attention
  window.postMessage(
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

window.addEventListener("message", (event) => {
  if (event.data.target !== "inpage") return

  // to demonstrate how it works it was necessary. Will remove later
  // eslint-disable-next-line no-console
  console.log("inpage: ", event.data)
})
