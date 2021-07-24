import React from "react"
import ReactDOM from "react-dom"
import Popup from "./pages/Popup"

/**
 * Attaches the Tally UI to the specified DOM element, eh?
 */
function attachToElement(element: Element): void {
  ReactDOM.render(React.createElement(Popup), element)
}

export default {
  attachToElement,
}
