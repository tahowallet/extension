// to demonstrate how it works it was necessary. Will remove later
// eslint-disable-next-line no-console
console.log("inpage.js in da house")

setInterval(() => {
  window.postMessage({
    target: "content",
    source: "inpage",
    message: "SYN",
  })

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
