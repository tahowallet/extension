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
    const isAppRendered = !!document.getElementsByClassName(
      "top_menu_wrap_decoy"
    ).length
    if (!isAppRendered) {
      window.location.reload()
    }
  }
}, 1000)

attachPopupUIToRootElement()
