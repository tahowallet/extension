import React from "react"
import ReactDOM from "react-dom"
import { Store } from "webext-redux"

import Popup from "./pages/Popup"

/**
 * Attaches the Tally UI to the specified DOM element, eh?
 */
async function attachToElement(element: Element): Promise<void> {
  const backgroundStore = new Store()
  await backgroundStore.ready()

  ReactDOM.render(
    React.createElement(Popup, { store: backgroundStore }),
    element
  )
}

export default {
  attachToElement,
}
