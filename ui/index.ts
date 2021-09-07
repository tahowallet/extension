import React from "react"
import ReactDOM from "react-dom"
import { newProxyStore } from "@tallyho/tally-background"

import Popup from "./pages/Popup"

/**
 * Attaches the Tally UI to the specified DOM element, eh?
 */
async function attachToElement(element: Element): Promise<void> {
  const backgroundStore = await newProxyStore()

  ReactDOM.render(
    React.createElement(Popup, { store: backgroundStore }),
    element
  )
}

export default {
  attachToElement,
}
