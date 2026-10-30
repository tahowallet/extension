import React from "react"
import { MemoryRouter } from "react-router-dom"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { ETHEREUM, POLYGON } from "@tallyho/tally-background/constants"
import { initialState as dappInitialState } from "@tallyho/tally-background/redux-slices/dapp"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import { createAccountData } from "@tallyho/tally-background/tests/factories"
import DAppConnectRequest from "../DAppConnectRequest"
import { renderWithProviders } from "../../tests/test-utils"
import { TEST_ADDRESS } from "../../tests/factories"

const ORIGIN = "https://app.test"

const NEW_CONNECTION: PermissionRequest = {
  key: `${ORIGIN}_${TEST_ADDRESS}`,
  origin: ORIGIN,
  faviconUrl: "",
  title: "Test dApp",
  state: "request",
  accountAddress: TEST_ADDRESS,
}

const renderRequest = (request: PermissionRequest) =>
  renderWithProviders(
    <MemoryRouter>
      <DAppConnectRequest />
    </MemoryRouter>,
    {
      preloadedState: {
        account: {
          accountsData: {
            evm: {
              [ETHEREUM.chainID]: {
                [TEST_ADDRESS]: createAccountData({
                  address: TEST_ADDRESS,
                  network: ETHEREUM,
                }),
              },
            },
          },
        },
        networks: {
          ...networksInitialState,
          evmNetworks: {
            [ETHEREUM.chainID]: ETHEREUM,
            [POLYGON.chainID]: POLYGON,
          },
        },
        ui: {
          ...uiInitialState,
          selectedAccount: { address: TEST_ADDRESS, network: ETHEREUM },
        },
        dapp: {
          ...dappInitialState,
          permissionRequests: { [ORIGIN]: request },
        },
      },
    },
  )

describe("DAppConnectRequest", () => {
  test("should ask to connect for a request without a chainID", () => {
    const ui = renderRequest(NEW_CONNECTION)

    expect(ui.getByText("Connect to dApp")).toBeVisible()
    expect(ui.queryByText(/Allow .* to use/)).toBeNull()
  })

  test("should ask about the requested network for a request with a chainID", () => {
    const ui = renderRequest({ ...NEW_CONNECTION, chainID: POLYGON.chainID })

    expect(
      ui.getByText(`Allow Test dApp to use ${POLYGON.name}?`),
    ).toBeVisible()
    expect(ui.queryByText("Connect to dApp")).toBeNull()
  })
})
