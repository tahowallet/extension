import {
  attachPopupUIToRootElement,
  attachUIToRootElement,
} from "@tallyho/tally-ui"
import GlobalError from "@tallyho/tally-ui/components/GlobalError/GlobalError"

enum NavigationTimingType {
  "navigate",
  "reload",
  "back_forward",
  "prerender",
}

setTimeout(() => {
  const state = window.history?.state || {}
  let reloadCount = state?.reloadCount || 0
  // Check if the website was reloaded, using getEntriesByType method from the Performance interface for navigation.
  // This method return interface which provides information about browser's document navigation events.
  const navigationItem = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceEntry & { type: NavigationTimingType }
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
