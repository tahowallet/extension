import React from "react"
import { MemoryRouter, Route } from "react-router-dom"
import { MATIC, POLYGON } from "@tallyho/tally-background/constants"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { NetworkBaseAsset } from "@tallyho/tally-background/networks"
import { getFullAssetID } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import { createAccountData } from "@tallyho/tally-background/tests/factories"
import Swap from "../Swap"
import { renderWithProviders } from "../../tests/test-utils"
import { TEST_ADDRESS } from "../../tests/factories"

const WMATIC: SmartContractFungibleAsset = {
  name: "Wrapped Matic",
  symbol: "WMATIC",
  decimals: 18,
  contractAddress: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  homeNetwork: POLYGON,
  metadata: {
    tokenLists: [{ name: "Test list", url: "https://example.com/list.json" }],
  },
}

const ONE_TOKEN = 10n ** 18n

const renderSwap = (
  ownedAssets: (NetworkBaseAsset | SmartContractFungibleAsset)[],
  locationState: { symbol: string; contractAddress?: string },
) =>
  renderWithProviders(
    <MemoryRouter
      initialEntries={[{ pathname: "/swap", state: locationState }]}
    >
      <Route path="/swap" component={Swap} />
    </MemoryRouter>,
    {
      preloadedState: {
        account: {
          accountsData: {
            evm: {
              [POLYGON.chainID]: {
                [TEST_ADDRESS]: createAccountData({
                  address: TEST_ADDRESS,
                  network: POLYGON,
                  balances: Object.fromEntries(
                    ownedAssets.map((asset) => [
                      getFullAssetID(asset),
                      {
                        amount: 5n * ONE_TOKEN,
                        retrievedAt: Date.now(),
                        dataSource: "generic-rpc" as const,
                      },
                    ]),
                  ),
                }),
              },
            },
          },
        },
        assets: {
          ids: ownedAssets.map(getFullAssetID),
          entities: Object.fromEntries(
            ownedAssets.map((asset) => [getFullAssetID(asset), asset]),
          ),
        },
        ui: {
          ...uiInitialState,
          selectedAccount: { address: TEST_ADDRESS, network: POLYGON },
        },
      },
    },
  )

describe("Swap", () => {
  // MATIC on Polygon (like ETH on Optimism) is a network base asset that also
  // carries a contract address, so callers can hand one over for it.
  it("preselects a base asset whose location state carries a contract address", () => {
    expect(MATIC.contractAddress).toBeDefined()

    const ui = renderSwap([MATIC], {
      symbol: MATIC.symbol,
      contractAddress: MATIC.contractAddress,
    })

    expect(ui.getByTestId("selected_asset_button")).toHaveTextContent("MATIC")
  })

  it("preselects a base asset by symbol alone", () => {
    const ui = renderSwap([MATIC], { symbol: MATIC.symbol })

    expect(ui.getByTestId("selected_asset_button")).toHaveTextContent("MATIC")
  })

  it("preselects a smart contract asset by its contract address", () => {
    const ui = renderSwap([MATIC, WMATIC], {
      symbol: WMATIC.symbol,
      contractAddress: WMATIC.contractAddress,
    })

    expect(ui.getByTestId("selected_asset_button")).toHaveTextContent("WMATIC")
  })
})
