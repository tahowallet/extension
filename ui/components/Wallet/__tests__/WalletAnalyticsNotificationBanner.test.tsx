import React from "react"
import userEvent from "@testing-library/user-event"

import {
  defaultSettings,
  initialState,
} from "@tallyho/tally-background/redux-slices/ui"

import WalletAnalyticsNotificationBanner from "../WalletAnalyticsNotificationBanner"
import { renderWithProviders } from "../../../tests/test-utils"

describe("WalletAnalyticsNotificationBanner", () => {
  it("should be hidden by default", async () => {
    const ui = renderWithProviders(<WalletAnalyticsNotificationBanner />)
    const bannerContainer = ui.container.firstChild

    expect(bannerContainer).toHaveClass("hide")
  })
  it("should show when 'ui.settings.showAnalyticsNotification' is true", async () => {
    const ui = renderWithProviders(<WalletAnalyticsNotificationBanner />, {
      preloadedState: {
        ui: {
          ...initialState,
          settings: { ...defaultSettings, showAnalyticsNotification: true },
        },
      },
    })
    const bannerContainer = ui.container.firstChild

    expect(bannerContainer).not.toHaveClass("hide")
  })
  it("should disappear when the 'X' is clicked", async () => {
    const ui = renderWithProviders(<WalletAnalyticsNotificationBanner />, {
      preloadedState: {
        ui: {
          ...initialState,
          settings: { ...defaultSettings, showAnalyticsNotification: true },
        },
      },
    })
    const bannerContainer = ui.container.firstChild
    const closeButton = ui.getByLabelText("Close")

    expect(bannerContainer).not.toHaveClass("hide")

    await userEvent.click(closeButton)

    expect(bannerContainer).toHaveClass("hide")
  })
})
