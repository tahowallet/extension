import React from "react"
import { cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import SharedNetworkIconStack from "../SharedNetworkIconStack"
import { renderWithProviders } from "../../../tests/test-utils"

const FIVE_NETWORKS = [ETHEREUM, POLYGON, OPTIMISM, ARBITRUM_ONE, AVALANCHE]

afterEach(cleanup)

describe("SharedNetworkIconStack", () => {
  it("shows every icon when they fit", () => {
    const ui = renderWithProviders(
      <SharedNetworkIconStack networks={FIVE_NETWORKS.slice(0, 4)} />,
    )

    expect(ui.queryByTestId("network_stack_more")).not.toBeInTheDocument()
  })

  it("ends with an ellipsis when there are more networks than icons", () => {
    const ui = renderWithProviders(
      <SharedNetworkIconStack networks={FIVE_NETWORKS} />,
    )

    expect(ui.getByTestId("network_stack_more")).toBeInTheDocument()
  })

  it("lists every network in its tooltip", async () => {
    const ui = renderWithProviders(
      <SharedNetworkIconStack networks={FIVE_NETWORKS} />,
    )

    await userEvent.hover(ui.getByRole("img"))

    FIVE_NETWORKS.forEach(({ name }) => {
      expect(ui.getByText(name)).toBeInTheDocument()
    })
    expect(ui.getByText("Name applies on 5 networks")).toBeInTheDocument()
  })
})
