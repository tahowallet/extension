import React from "react"
import ReactDOM from "react-dom"
//import Popup from "@tallyho/tally-ui/pages/Popup"

/**
 * Attaches the Tally UI to the specified DOM element.
 */
export function attachToElement(element) {
	ReactDOM.render(React.createElement(
		/* Popup */ () => React.createElement("p", null, "ohai")),
		element
	)
}
