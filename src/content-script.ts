try {
  // did not want to include the webextension polyfill as it makes this file huge 700B -> 3.3MB
  // and as this file get injected into all webpages this could result in significant slow down
  // and we don't use callback/promise apis so it would not give us any benefit
  let browserApi

  if (window.chrome) {
    browserApi = window.chrome
  } else {
    browserApi = browser
  }

  if (!browserApi) {
    throw new Error("Browser API is not present")
  }

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
