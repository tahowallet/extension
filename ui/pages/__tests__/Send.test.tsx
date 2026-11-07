import React, { ReactNode } from "react"
import { MemoryRouter, Route } from "react-router-dom"
import { act, fireEvent, waitFor } from "@testing-library/react"
import { ETHEREUM, POLYGON } from "@tallyho/tally-background/constants"
import type { EVMNetwork } from "@tallyho/tally-background/networks"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import { createAccountData } from "@tallyho/tally-background/tests/factories"
import Send from "../Send"
import { renderWithProviders } from "../../tests/test-utils"
import { TEST_ADDRESS } from "../../tests/factories"

// The page frame brings the top and tab bars, which need the extension APIs.
jest.mock("../../components/Core/CorePage", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}))

// The name resolution thunks reach into the background, which isn't running
// in tests. Stand in thunks that call these mocks, so each test decides what a
// name resolves to, and whether it is control-compatible.
const mockResolveNameOnNetwork = jest.fn()
const mockCheckControlCompatibility = jest.fn()
jest.mock("@tallyho/tally-background/redux-slices/accounts", () => ({
  __esModule: true,
  resolveNameOnNetwork: (args: unknown) => () => mockResolveNameOnNetwork(args),
  checkControlCompatibility: (args: unknown) => () =>
    mockCheckControlCompatibility(args),
}))

const mockTransferAsset = jest.fn()
jest.mock("@tallyho/tally-background/redux-slices/assets", () => ({
  __esModule: true,
  transferAsset: (args: unknown) => () => mockTransferAsset(args),
}))

const NAME = "vitalik.eth"
const RESOLVED_ADDRESS = "0x000000000000000000000000000000000000dEaD"
const RAW_ADDRESS = "0x1111111111111111111111111111111111111111"
const WARNING = /isn't known to be controlled by the same person/

const renderSend = (network: EVMNetwork) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[{ pathname: "/send" }]}>
      <Route path="/send" component={Send} />
    </MemoryRouter>,
    {
      preloadedState: {
        account: {
          accountsData: {
            evm: {
              [network.chainID]: {
                [TEST_ADDRESS]: createAccountData({
                  address: TEST_ADDRESS,
                  network,
                }),
              },
            },
          },
          controlCompatibility: {},
        },
        ui: {
          ...uiInitialState,
          selectedAccount: { address: TEST_ADDRESS, network },
        },
      },
    },
  )

// Resolves the name on the network it was asked about; the given networks
// resolve it, and the others do not.
const resolvableOn = (...networks: EVMNetwork[]) => {
  mockResolveNameOnNetwork.mockImplementation(
    async ({ network }: { network: EVMNetwork }) =>
      networks.some((resolvable) => resolvable.chainID === network.chainID)
        ? { address: RESOLVED_ADDRESS, network }
        : undefined,
  )
}

describe("Send recipient name resolution", () => {
  beforeEach(() => {
    mockResolveNameOnNetwork.mockReset()
    mockCheckControlCompatibility.mockReset()
    mockTransferAsset.mockReset()
  })

  it("resolves a name on the current network without a warning", async () => {
    resolvableOn(POLYGON)

    const ui = renderSend(POLYGON)
    fireEvent.change(ui.container.querySelector("#send_address")!, {
      target: { value: NAME },
    })

    expect(await ui.findByText(RESOLVED_ADDRESS)).toBeInTheDocument()
    expect(ui.queryByText(WARNING)).not.toBeInTheDocument()
    expect(mockCheckControlCompatibility).not.toHaveBeenCalled()
    expect(mockResolveNameOnNetwork).toHaveBeenCalledTimes(1)
  })

  it("falls back to Ethereum and warns, but allows sending, when not control-compatible", async () => {
    resolvableOn(ETHEREUM)
    mockCheckControlCompatibility.mockResolvedValue(false)

    const ui = renderSend(POLYGON)
    fireEvent.change(ui.container.querySelector("#send_address")!, {
      target: { value: NAME },
    })

    expect(await ui.findByText(WARNING)).toBeInTheDocument()
    expect(ui.getByText(/on Polygon\./)).toBeInTheDocument()
    expect(ui.getByText(RESOLVED_ADDRESS)).toBeInTheDocument()
    expect(mockCheckControlCompatibility).toHaveBeenCalledWith({
      objectOnNetwork: { name: NAME, network: ETHEREUM },
      otherNetwork: POLYGON,
    })

    // The recipient is still usable: with an amount entered, Continue enables.
    fireEvent.change(ui.getByPlaceholderText("0.0"), {
      target: { value: "1" },
    })
    expect(ui.getByRole("button", { name: "Continue" })).toBeEnabled()
  })

  it("resolves a name from Ethereum without a warning when control-compatible", async () => {
    resolvableOn(ETHEREUM)
    mockCheckControlCompatibility.mockResolvedValue(true)

    const ui = renderSend(POLYGON)
    fireEvent.change(ui.container.querySelector("#send_address")!, {
      target: { value: NAME },
    })

    expect(await ui.findByText(RESOLVED_ADDRESS)).toBeInTheDocument()
    expect(ui.queryByText(WARNING)).not.toBeInTheDocument()
  })

  it("drops a late name result once the input has become a raw address", async () => {
    // Hold the name's lookup on the current network until the test resolves it.
    let resolveName: (value: unknown) => void = () => {}
    mockResolveNameOnNetwork.mockImplementation(
      ({ network }: { network: EVMNetwork }) =>
        network.chainID === POLYGON.chainID
          ? new Promise((resolve) => {
              resolveName = resolve
            })
          : Promise.resolve(undefined),
    )

    const ui = renderSend(POLYGON)
    const input = ui.container.querySelector("#send_address")!
    fireEvent.change(input, { target: { value: NAME } })
    await waitFor(() =>
      expect(mockResolveNameOnNetwork).toHaveBeenCalledTimes(1),
    )

    fireEvent.change(input, { target: { value: RAW_ADDRESS } })
    await act(async () => {
      resolveName({ address: RESOLVED_ADDRESS, network: POLYGON })
    })

    expect(ui.queryByText(RESOLVED_ADDRESS)).not.toBeInTheDocument()
    expect(ui.queryByText(WARNING)).not.toBeInTheDocument()

    fireEvent.change(ui.getByPlaceholderText("0.0"), {
      target: { value: "1" },
    })
    fireEvent.click(ui.getByRole("button", { name: "Continue" }))
    await waitFor(() =>
      expect(mockTransferAsset).toHaveBeenCalledWith(
        expect.objectContaining({
          toAddressNetwork: expect.objectContaining({ address: RAW_ADDRESS }),
        }),
      ),
    )
  })

  it("does not fall back when the current network is Ethereum", async () => {
    resolvableOn()

    const ui = renderSend(ETHEREUM)
    fireEvent.change(ui.container.querySelector("#send_address")!, {
      target: { value: NAME },
    })

    expect(
      await ui.findByText(/Address could not be found/),
    ).toBeInTheDocument()
    expect(mockResolveNameOnNetwork).toHaveBeenCalledTimes(1)
    expect(mockCheckControlCompatibility).not.toHaveBeenCalled()
  })
})
