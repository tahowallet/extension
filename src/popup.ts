import {
  attachPopupUIToRootElement,
  attachUIToRootElement,
} from "@tallyho/tally-ui"
import GlobalError from "@tallyho/tally-ui/components/GlobalError/GlobalError"

// Prevents from the green screen. The solution checks if the first top-level element is rendered.
// If this does not happen then reload the UI thread.  To prevent an infinity loop
// the restart will be done max 3 times then a global error screen will be shown.

setTimeout(() => {
  const state = window.history?.state || {}
  let reloadCount = state?.reloadCount || 0
  const navigationItem = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming

  if ((navigationItem?.type).toString() === "reload") {
    reloadCount += 1
    state.reloadCount = reloadCount
    window.history.replaceState(state, "", document.URL)
  } else if (reloadCount) {
    delete state.reloadCount
    reloadCount = 0
    window.history.replaceState(state, "", document.URL)
  }
  if (reloadCount > 2) {
    attachUIToRootElement(GlobalError)
    delete state.reloadCount
    reloadCount = 0
    window.history.replaceState(state, "", document.URL)
  } else {
    const isAppRendered = document.getElementsByTagName("main").length > 0
    if (!isAppRendered) {
      window.location.reload()
    }
  }
}, 1000)

const POPUP_WIDTH = 384
const POPUP_HEIGHT = 600

/**
 * Because browser.windows.create(...) takes a height and width that includes
 * the native browser window frame, some popups end up slighty smaller than
 * the popup triggered by the Tally toolbar icon. To fix this we resize the
 * window by the window frame's size.
 */
const missingWidth = POPUP_WIDTH - window.innerWidth
// TODO: Change this to use POPUP_HEIGHT and test signing and other popups
const missingHeight = POPUP_HEIGHT - window.innerHeight

window.resizeBy(missingWidth, missingHeight)

attachPopupUIToRootElement()
