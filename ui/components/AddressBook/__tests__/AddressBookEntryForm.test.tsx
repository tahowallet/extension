import React from "react"
import { cleanup, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ETHEREUM, POLYGON } from "@tallyho/tally-background/constants"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import AddressBookEntryForm from "../AddressBookEntryForm"
import { renderWithProviders } from "../../../tests/test-utils"
import { createAccountState } from "../../../tests/factories"

// Saving reaches into the background, which isn't running in tests.
const mockSave = jest.fn()
jest.mock("@tallyho/tally-background/redux-slices/address-book", () => ({
  __esModule: true,
  saveAddressBookEntry: (args: unknown) => () => mockSave(args),
  removeAddressBookEntry: () => () => undefined,
}))

const ADDRESS = "0x1111111111111111111111111111111111111111"

const renderAddForm = (
  onSaved = jest.fn(),
  {
    address,
    controlCompatibility = {},
  }: {
    address?: string
    controlCompatibility?: {
      [address: string]: { [chainID: string]: string[] }
    }
  } = {},
) =>
  renderWithProviders(
    <AddressBookEntryForm
      address={address}
      network={ETHEREUM}
      onSaved={onSaved}
    />,
    {
      preloadedState: {
        addressBook: { entries: [] },
        account: createAccountState({ controlCompatibility }),
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
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ADDRESS,
        network: ETHEREUM,
        name: "Brother",
        additionalChainIDs: [],
      }),
    )
  })
})

describe("AddressBookEntryForm networks", () => {
  const WARNING = /sure the same owner controls this address/

  it("applies a name where the same keys control the address, without asking", async () => {
    const ui = renderAddForm(jest.fn(), {
      address: ADDRESS,
      controlCompatibility: {
        [ADDRESS]: { [ETHEREUM.chainID]: [POLYGON.chainID] },
      },
    })

    await userEvent.click(ui.getByRole("button", { name: /Applies on/ }))

    const polygon = ui.getByRole("checkbox", { name: /Polygon/ })
    expect(polygon).toBeChecked()
    expect(polygon).toBeDisabled()
    expect(ui.queryByText(WARNING)).not.toBeInTheDocument()
  })

  it("warns when the user applies a name to another network", async () => {
    mockSave.mockResolvedValue({ success: true })
    const ui = renderAddForm(jest.fn(), { address: ADDRESS })

    await userEvent.click(ui.getByRole("button", { name: /Applies on/ }))
    await userEvent.click(ui.getByRole("checkbox", { name: /Polygon/ }))
    expect(ui.getByText(WARNING)).toBeInTheDocument()

    await userEvent.type(ui.getByLabelText("Choose a name"), "Brother")
    await userEvent.click(
      ui.getByRole("button", { name: "Add to address book" }),
    )

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          network: ETHEREUM,
          additionalChainIDs: [POLYGON.chainID],
        }),
      ),
    )
  })

  it("moves the name to another network when its own is unchecked", async () => {
    mockSave.mockResolvedValue({ success: true })
    const ui = renderAddForm(jest.fn(), { address: ADDRESS })

    await userEvent.click(ui.getByRole("button", { name: /Applies on/ }))
    await userEvent.click(ui.getByRole("checkbox", { name: /Polygon/ }))
    await userEvent.click(ui.getByRole("checkbox", { name: /Ethereum/ }))
    // Saved on Polygon alone, so there's nothing to vouch for.
    expect(ui.queryByText(WARNING)).not.toBeInTheDocument()

    await userEvent.type(ui.getByLabelText("Choose a name"), "Brother")
    await userEvent.click(
      ui.getByRole("button", { name: "Add to address book" }),
    )

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ network: POLYGON, additionalChainIDs: [] }),
      ),
    )
  })

  it("keeps at least one network chosen", async () => {
    const ui = renderAddForm(jest.fn(), { address: ADDRESS })

    await userEvent.click(ui.getByRole("button", { name: /Applies on/ }))

    expect(ui.getByRole("checkbox", { name: /Ethereum/ })).toBeDisabled()
  })
})
