import React from "react"
import { MemoryRouter, Route } from "react-router-dom"
import { MATIC, POLYGON } from "@tallyho/tally-background/constants"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { getFullAssetID } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import { createAccountData } from "@tallyho/tally-background/tests/factories"
import SingleAsset from "../SingleAsset"
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

const renderSingleAsset = (
  asset: typeof MATIC | SmartContractFungibleAsset,
  amount: bigint,
) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[{ pathname: "/singleAsset", state: asset }]}>
      <Route path="/singleAsset" component={SingleAsset} />
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
                  balances: {
                    [getFullAssetID(asset)]: {
                      amount,
                      retrievedAt: Date.now(),
                      dataSource: "generic-rpc",
                    },
                  },
                }),
              },
            },
          },
        },
        assets: {
          ids: [getFullAssetID(asset)],
          entities: { [getFullAssetID(asset)]: asset },
        },
        ui: {
          ...uiInitialState,
          selectedAccount: { address: TEST_ADDRESS, network: POLYGON },
        },
      },
    },
  )

describe("SingleAsset", () => {
  // MATIC on Polygon (like ETH on Optimism) is a network base asset that also
  // carries a contract address; it must still be resolved as a base asset.
  it("displays the balance of a base asset that has a contract address", () => {
    expect(MATIC.contractAddress).toBeDefined()

    const ui = renderSingleAsset(MATIC, 2n * 10n ** 18n)

    expect(ui.getByRole("group", { name: "Asset info" })).toBeInTheDocument()
    expect(ui.getByTestId("asset_balance")).toHaveTextContent("2")
  })

  it("does not link a base asset to a block explorer token page", () => {
    const ui = renderSingleAsset(MATIC, 2n * 10n ** 18n)

    expect(
      ui.queryByRole("link", { name: /polygonscan/i }),
    ).not.toBeInTheDocument()
    expect(
      ui.getByRole("group", { name: "Asset info" }).querySelector("a"),
    ).toBeNull()
  })

  it("displays the balance of a smart contract asset and links to its token page", () => {
    const ui = renderSingleAsset(WMATIC, 3n * 10n ** 18n)

    expect(ui.getByTestId("asset_balance")).toHaveTextContent("3")
    expect(
      ui.getByRole("group", { name: "Asset info" }).querySelector("a"),
    ).toHaveAttribute(
      "href",
      `https://polygonscan.com/token/${WMATIC.contractAddress}`,
    )
  })
})
