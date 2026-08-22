import React from "react"
import { MemoryRouter } from "react-router-dom"
import { OPTIMISM } from "@tallyho/tally-background/constants"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import {
  initialState as transactionConstructionInitialState,
  TransactionConstructionStatus,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import SigningNetworkAccountInfoTopBar from "../SigningNetworkAccountInfoTopBar"
import { renderWithProviders } from "../../../tests/test-utils"
import { TEST_ADDRESS } from "../../../tests/factories"

const ACCOUNT_TOTAL = {
  address: TEST_ADDRESS,
  network: OPTIMISM,
  shortenedAddress: "0x208e9",
  name: "Test",
  avatarURL: undefined,
} as unknown as AccountTotal

const renderTopBar = (unreachableChainID?: string) =>
  renderWithProviders(
    <MemoryRouter>
      <SigningNetworkAccountInfoTopBar accountTotal={ACCOUNT_TOTAL} />
    </MemoryRouter>,
    {
      preloadedState: {
        networks: {
          ...networksInitialState,
          unreachableNetworks:
            unreachableChainID === undefined
              ? {}
              : { [unreachableChainID]: true },
        },
        transactionConstruction: {
          ...transactionConstructionInitialState,
          status: TransactionConstructionStatus.Loaded,
          transactionRequest: { network: OPTIMISM } as never,
        },
      },
    },
  )

describe("SigningNetworkAccountInfoTopBar", () => {
  it("says nothing about a network that is answering", () => {
    const ui = renderTopBar()

    expect(ui.getByText(OPTIMISM.name)).toBeVisible()
    expect(
      ui.queryByLabelText("Network connection problem"),
    ).not.toBeInTheDocument()
  })

  it("marks the network this signature would go to when it cannot be reached", () => {
    // Beside the network rather than beside the button: the button's own
    // tooltip explains the block, this explains what is wrong with the chain.
    const ui = renderTopBar(OPTIMISM.chainID)

    expect(ui.getByLabelText("Network connection problem")).toBeVisible()
  })

  it("leaves an unrelated network's outage out of it", () => {
    const ui = renderTopBar("137")

    expect(
      ui.queryByLabelText("Network connection problem"),
    ).not.toBeInTheDocument()
  })
})
