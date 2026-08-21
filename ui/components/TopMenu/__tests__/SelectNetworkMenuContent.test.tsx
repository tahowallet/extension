import React from "react"
import { MemoryRouter } from "react-router-dom"
import { ETHEREUM, OPTIMISM } from "@tallyho/tally-background/constants"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import SelectNetworkMenuContent from "../SelectNetworkMenuContent"
import { renderWithProviders } from "../../../tests/test-utils"

const renderNetworkList = (unreachableNetworks: {
  [chainID: string]: boolean
}) =>
  renderWithProviders(
    <MemoryRouter>
      <SelectNetworkMenuContent
        currentNetwork={ETHEREUM}
        onNetworkChange={() => {}}
      />
    </MemoryRouter>,
    {
      preloadedState: {
        networks: {
          ...networksInitialState,
          evmNetworks: {
            [ETHEREUM.chainID]: ETHEREUM,
            [OPTIMISM.chainID]: OPTIMISM,
          },
          unreachableNetworks,
        },
      },
    },
  )

describe("SelectNetworkMenuContent", () => {
  it("says nothing about networks that are answering", () => {
    const ui = renderNetworkList({})

    expect(ui.getByText(ETHEREUM.name)).toBeVisible()
    expect(ui.getByText(OPTIMISM.name)).toBeVisible()
    expect(ui.queryAllByLabelText("Network connection problem")).toHaveLength(0)
  })

  it("flags only the row for the network that is down", () => {
    // A chain the user is not currently on can be down while the selected one
    // is fine, so the warning has to be per row rather than per wallet.
    const ui = renderNetworkList({ [OPTIMISM.chainID]: true })

    expect(ui.getAllByLabelText("Network connection problem")).toHaveLength(1)
  })
})
