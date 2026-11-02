import React from "react"
import { fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import Settings from "../Settings"
import { renderWithProviders } from "../../tests/test-utils"

jest.mock("webextension-polyfill", () => ({}))

describe("Settings appearance", () => {
  it("shows the current theme and stores a new choice", async () => {
    const { store, getByText, getByRole } = renderWithProviders(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
      {
        preloadedState: { ui: uiInitialState },
      },
    )

    expect(getByText("Appearance")).toBeInTheDocument()
    expect(getByRole("option", { name: "Dark" })).toHaveAttribute(
      "aria-selected",
      "true",
    )

    fireEvent.click(getByRole("option", { name: "Light" }))
    await waitFor(() =>
      expect(store.getState().ui.settings.theme).toBe("light"),
    )

    fireEvent.click(getByRole("option", { name: "System" }))
    await waitFor(() =>
      expect(store.getState().ui.settings.theme).toBe("system"),
    )
  })
})
