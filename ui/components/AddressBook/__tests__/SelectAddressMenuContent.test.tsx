import React from "react"
import { cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ETHEREUM, POLYGON } from "@tallyho/tally-background/constants"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import type { AddressBookEntry } from "@tallyho/tally-background/redux-slices/address-book"
import SelectAddressMenuContent from "../SelectAddressMenuContent"
import { renderWithProviders } from "../../../tests/test-utils"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import { createAccountState, TEST_ADDRESS } from "../../../tests/factories"

const entry = (
  name: string,
  address: string,
  network = ETHEREUM,
  updatedAt = 1,
): AddressBookEntry => ({
  name,
  address: normalizeEVMAddress(address),
  network,
  additionalChainIDs: [],
  createdAt: updatedAt,
  updatedAt,
})

const BROTHER = entry("Brother", "0x1111111111111111111111111111111111111111")
const EXCHANGE = entry(
  "Bitstamp account",
  "0x2222222222222222222222222222222222222222",
)
const POLYGON_ONLY = entry(
  "Polygon friend",
  "0x3333333333333333333333333333333333333333",
  POLYGON,
)

const renderMenu = (onSelect = () => {}, currentAddress = "") =>
  renderWithProviders(
    <SelectAddressMenuContent network={ETHEREUM} onSelect={onSelect} />,
    {
      preloadedState: {
        addressBook: { entries: [BROTHER, EXCHANGE, POLYGON_ONLY] },
        account: createAccountState(),
        ui: {
          ...uiInitialState,
          selectedAccount: { address: currentAddress, network: ETHEREUM },
        },
        networks: {
          ...networksInitialState,
          evmNetworks: {
            [ETHEREUM.chainID]: ETHEREUM,
            [POLYGON.chainID]: POLYGON,
          },
        },
      },
    },
  )

afterEach(cleanup)

describe("SelectAddressMenuContent", () => {
  it("is headed as a selection, not a send", () => {
    const ui = renderMenu()

    expect(ui.getByText("Select address")).toBeInTheDocument()
    expect(ui.queryByText(/send to address/i)).not.toBeInTheDocument()
  })

  it("lists saved addresses and the user's accounts together", () => {
    const ui = renderMenu()

    expect(ui.getByText("Brother")).toBeInTheDocument()
    expect(ui.getByText("Bitstamp account")).toBeInTheDocument()
    expect(ui.getByText("Your account")).toBeInTheDocument()
    // Saved on another network, and not known to apply on this one.
    expect(ui.queryByText("Polygon friend")).not.toBeInTheDocument()
  })

  it("lists the current account, marked as such", () => {
    const ui = renderMenu(undefined, TEST_ADDRESS)

    expect(ui.getByText("test.crypto")).toBeInTheDocument()
    expect(ui.getByText("Current account")).toBeInTheDocument()
    expect(ui.queryByText("Your account")).not.toBeInTheDocument()
  })

  it("edits an account's own name as an entry headed as an edit", async () => {
    const ui = renderMenu()

    // The account is listed after the saved entries, by name.
    const buttons = ui.getAllByRole("button", { name: "Edit" })
    await userEvent.click(buttons[buttons.length - 1])

    expect(ui.getByText("Edit address book entry")).toBeInTheDocument()
    expect(ui.queryByText("Add to address book")).not.toBeInTheDocument()
    expect(ui.getByLabelText("Choose a name")).toHaveValue("test.crypto")
  })

  it("filters by name or address", async () => {
    const ui = renderMenu()
    const search = ui.getByPlaceholderText("Search by name or address")

    await userEvent.type(search, "bro")
    expect(ui.getByText("Brother")).toBeInTheDocument()
    expect(ui.queryByText("Bitstamp account")).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, "0x2222")
    expect(ui.queryByText("Brother")).not.toBeInTheDocument()
    expect(ui.getByText("Bitstamp account")).toBeInTheDocument()
  })

  it("selects the highlighted address with the keyboard", async () => {
    const onSelect = jest.fn()
    const ui = renderMenu(onSelect)

    await userEvent.type(
      ui.getByPlaceholderText("Search by name or address"),
      "bro{Enter}",
    )

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ address: BROTHER.address, name: "Brother" }),
    )
  })
})
