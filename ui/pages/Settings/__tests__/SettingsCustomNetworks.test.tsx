import React from "react"
import { MemoryRouter, Route } from "react-router-dom"
import { ETHEREUM, OPTIMISM } from "@tallyho/tally-background/constants"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import SettingsCustomNetworks from "../SettingsCustomNetworks"
import { renderWithProviders } from "../../../tests/test-utils"

// The form itself talks to the background as soon as it mounts to load the
// chain's endpoints; what this page decides is whether to show it at all.
jest.mock("../CustomNetworkEditForm", () => ({
  __esModule: true,
  EDIT_FORM_MENU_HEIGHT: "500px",
  default: () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const react = require("react")
    return react.createElement("div", null, "network edit form")
  },
}))

const PATH = "/settings/custom-networks"

const renderCustomNetworks = (state?: { editChainID: string }) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[{ pathname: PATH, state }]}>
      <Route path={PATH} component={SettingsCustomNetworks} />
    </MemoryRouter>,
    {
      preloadedState: {
        networks: {
          ...networksInitialState,
          evmNetworks: {
            [ETHEREUM.chainID]: ETHEREUM,
            [OPTIMISM.chainID]: OPTIMISM,
          },
        },
      },
    },
  )

describe("SettingsCustomNetworks", () => {
  it("lands on the list when nothing asked for a particular network", () => {
    const ui = renderCustomNetworks()

    expect(ui.getByText(ETHEREUM.name)).toBeVisible()
    expect(ui.queryByText("network edit form")).not.toBeInTheDocument()
  })

  it("opens the edit form for the network it was sent here for", () => {
    // A bare push would land on the list and leave the user to find the row
    // themselves, which defeats the point of linking from a warning.
    const ui = renderCustomNetworks({ editChainID: OPTIMISM.chainID })

    expect(ui.getByText("network edit form")).toBeVisible()
  })

  it("ignores a network it does not know about", () => {
    const ui = renderCustomNetworks({ editChainID: "31337" })

    expect(ui.queryByText("network edit form")).not.toBeInTheDocument()
  })
})
