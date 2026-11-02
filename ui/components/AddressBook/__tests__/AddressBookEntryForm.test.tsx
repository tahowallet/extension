import React from "react"
import { cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import AddressBookEntryForm from "../AddressBookEntryForm"
import { renderWithProviders } from "../../../tests/test-utils"

// Saving reaches into the background, which isn't running in tests.
const mockSave = jest.fn()
jest.mock("@tallyho/tally-background/redux-slices/address-book", () => ({
  __esModule: true,
  saveAddressBookEntry: (args: unknown) => () => mockSave(args),
  removeAddressBookEntry: () => () => undefined,
}))

const ADDRESS = "0x1111111111111111111111111111111111111111"

const renderAddForm = (onSaved = jest.fn()) =>
  renderWithProviders(
    <AddressBookEntryForm
      addressOnNetwork={{ network: ETHEREUM }}
      onSaved={onSaved}
    />,
    {
      preloadedState: {
        addressBook: { entries: [] },
        networks: {
          ...networksInitialState,
          evmNetworks: { [ETHEREUM.chainID]: ETHEREUM },
        },
      },
    },
  )

afterEach(() => {
  cleanup()
  mockSave.mockReset()
})

describe("AddressBookEntryForm without an address", () => {
  it("asks for the address and refuses one that isn't valid", async () => {
    const ui = renderAddForm()

    await userEvent.type(ui.getByLabelText("Address"), "not an address")
    await userEvent.type(ui.getByLabelText("Choose a name"), "Brother")
    await userEvent.click(
      ui.getByRole("button", { name: "Add to address book" }),
    )

    expect(ui.getByText("Enter a valid address")).toBeInTheDocument()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("saves the entered address on the given network", async () => {
    mockSave.mockResolvedValue({ success: true })
    const onSaved = jest.fn()
    const ui = renderAddForm(onSaved)

    await userEvent.type(ui.getByLabelText("Address"), ADDRESS)
    await userEvent.type(ui.getByLabelText("Choose a name"), "Brother")
    await userEvent.click(
      ui.getByRole("button", { name: "Add to address book" }),
    )

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(mockSave).toHaveBeenCalledWith({
      address: ADDRESS,
      network: ETHEREUM,
      name: "Brother",
    })
  })
})
