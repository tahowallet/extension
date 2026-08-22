import React from "react"
import { MemoryRouter } from "react-router-dom"
import { OPTIMISM } from "@tallyho/tally-background/constants"
import NetworkUnreachableBanner from "../NetworkUnreachableBanner"
import { renderWithProviders } from "../../../tests/test-utils"

const renderBanner = () =>
  renderWithProviders(
    <MemoryRouter>
      <NetworkUnreachableBanner network={OPTIMISM} />
    </MemoryRouter>,
  )

describe("NetworkUnreachableBanner", () => {
  it("announces itself rather than waiting to be noticed", () => {
    const ui = renderBanner()

    expect(ui.getByRole("alert")).toBeVisible()
  })

  it("names the network that is down, since the others may be fine", () => {
    const ui = renderBanner()

    expect(ui.getByText(`Taho can't reach ${OPTIMISM.name}`)).toBeVisible()
  })

  it("points at the settings that could fix it", () => {
    const ui = renderBanner()

    expect(
      ui.getByRole("button", { name: /Check RPC settings/ }),
    ).toBeInTheDocument()
  })
})
