import { newProxyStore } from "@tallyho/tally-background"
import React, { ComponentType } from "react"
import ReactDOM from "react-dom"
import { Store } from "webext-redux"
import "./_locales/i18n"
import Popup from "./pages/Popup"
import Tab from "./pages/Tab"

export { Popup, Tab }

export async function attachUiToRootElement(
  component: ComponentType<{ store: Store }>
): Promise<void> {
  const rootElement = document.getElementById("tally-root")

  if (!rootElement) {
    throw new Error(
      "Failed to find #tally-root element; page structure changed?"
    )
  }

  const backgroundStore = await newProxyStore()

  ReactDOM.render(
    React.createElement(component, { store: backgroundStore }),
    rootElement
  )
}
