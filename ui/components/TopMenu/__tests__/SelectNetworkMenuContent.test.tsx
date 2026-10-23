import React from "react"
import { MemoryRouter } from "react-router-dom"
import userEvent from "@testing-library/user-event"
import { ETHEREUM, OPTIMISM } from "@tallyho/tally-background/constants"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import SelectNetworkMenuContent from "../SelectNetworkMenuContent"
import { renderWithProviders } from "../../../tests/test-utils"

const renderNetworkList = (
  unreachableNetworks: { [chainID: string]: boolean },
  onNetworkChange: () => void = () => {},
) =>
  renderWithProviders(
    <MemoryRouter>
      <SelectNetworkMenuContent
        currentNetwork={ETHEREUM}
        onNetworkChange={onNetworkChange}
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

  it("stops calling the current network connected once it is not", () => {
    const ui = renderNetworkList({ [ETHEREUM.chainID]: true })

    expect(ui.queryByText("Connected")).not.toBeInTheDocument()
    expect(ui.getByText("Disconnected")).toBeVisible()
  })

  it("still says connected while the current network answers", () => {
    const ui = renderNetworkList({ [OPTIMISM.chainID]: true })

    expect(ui.getByText("Connected")).toBeVisible()
    expect(ui.queryByText("Disconnected")).not.toBeInTheDocument()
  })

  it("does not switch the user onto the broken chain on the way to fixing it", async () => {
    // The whole row selects its network on click, and the warning's tooltip
    // sits inside the row.
    const onNetworkChange = jest.fn()
    const ui = renderNetworkList({ [OPTIMISM.chainID]: true }, onNetworkChange)

    await userEvent.click(ui.getByLabelText("Network connection problem"))

    expect(onNetworkChange).not.toHaveBeenCalled()
  })
})
