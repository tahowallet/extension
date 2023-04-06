import React, { ComponentType } from "react"
import ReactDOM from "react-dom"
import { Store } from "webext-redux"
import { browser, newProxyStore } from "@tallyho/tally-background"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import "./_locales/i18n"
import { getAllAddresses } from "@tallyho/tally-background/redux-slices/selectors"
import logger from "@tallyho/tally-background/lib/logger"
import Popup from "./pages/Popup"
import Tab from "./pages/Tab"

logger.contextId = "UI"

export async function attachUIToRootElement(
  component: ComponentType<{ store: Store }>,
  store?: Store
): Promise<void> {
  const rootElement = document.getElementById("tally-root")

  if (!rootElement) {
    throw new Error(
      "Failed to find #tally-root element; page structure changed?"
    )
  }

  const backgroundStore = store ?? (await newProxyStore())

  ReactDOM.render(
    React.createElement(component, { store: backgroundStore }),
    rootElement
  )
}

export async function attachTabUIToRootElement(): Promise<void> {
  await attachUIToRootElement(Tab)
}

export async function attachPopupUIToRootElement(): Promise<void> {
  const store = await newProxyStore()

  if (isEnabled(FeatureFlags.SUPPORT_TABBED_ONBOARDING)) {
    const state = store.getState()

    if (getAllAddresses(state).length === 0) {
      // we're onboarding! look for an onboarding tab, or open a new one,
      // rather than rendering the popup
      const baseURL = browser.runtime.getURL("tab.html")
      const tabs = (await browser.tabs.query({ url: baseURL })).filter(
        (tab) => tab?.url && tab.url.includes("onboarding")
      )
      if (tabs.length > 0 && tabs[0]?.id) {
        await browser.tabs.update(tabs[0].id, { active: true })
      } else {
        await browser.tabs.create({
          url: browser.runtime.getURL("tab.html#onboarding"),
        })
      }
      window.close()
    }
  }

  await attachUIToRootElement(Popup, store)
}
