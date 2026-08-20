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

// An ERC-20 that impersonates the network's base asset by taking its symbol.
// Anyone can mint one, so a symbol is never enough to identify an asset.
const SCAM_MATIC: SmartContractFungibleAsset = {
  name: "Matic",
  symbol: "MATIC",
  decimals: 18,
  contractAddress: "0xbadbadbadbadbadbadbadbadbadbadbadbadbad0",
  homeNetwork: POLYGON,
  metadata: {
    tokenLists: [{ name: "Test list", url: "https://example.com/list.json" }],
  },
}

describe("Swap", () => {
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

  it("matches an owned token by address even when a base asset shares its symbol", () => {
    // Clicking the scam token's swap button passes its address. Base MATIC
    // sorts ahead of it and shares its symbol, so a symbol fallback would have
    // claimed the match first; the address branch has to run instead.
    const ui = renderSwap([MATIC, SCAM_MATIC], {
      symbol: SCAM_MATIC.symbol,
      contractAddress: SCAM_MATIC.contractAddress,
    })

    expect(ui.getByTestId("selected_asset_button")).toHaveTextContent("MATIC")
  })

  it("preselects the base asset when no address is given, even with a same-symbol token owned", () => {
    // MATIC on Polygon (like ETH on Optimism) is a base asset that carries a
    // contract address of its own, but producers pass no address for base
    // assets, so the symbol match is what identifies it.
    const ui = renderSwap([MATIC, SCAM_MATIC], { symbol: MATIC.symbol })

    expect(ui.getByTestId("selected_asset_button")).toHaveTextContent("MATIC")
  })

  it("preselects nothing for an unowned token address, rather than a same-symbol base asset", () => {
    // The scam case in the direction the DOM can show: an address that names
    // no owned token must not silently resolve to the base asset that happens
    // to share the requested symbol.
    const ui = renderSwap([MATIC, SCAM_MATIC], {
      symbol: MATIC.symbol,
      contractAddress: WMATIC.contractAddress,
    })

    expect(ui.queryByTestId("selected_asset_button")).not.toBeInTheDocument()
  })

  it("preselects nothing when the contract address matches no owned asset", () => {
    // No symbol fallback: an address that matches nothing leaves the form
    // empty rather than guessing at a same-symbol asset.
    const ui = renderSwap([MATIC, WMATIC], {
      symbol: WMATIC.symbol,
      contractAddress: "0x000000000000000000000000000000000000dead",
    })

    expect(ui.queryByTestId("selected_asset_button")).not.toBeInTheDocument()
  })

  it("preselects nothing when a base asset's own address is handed over as a token address", () => {
    // A producer that forwards a base asset wholesale leaks its pseudo-address;
    // treating the address as authoritative means that matches no token, and
    // an empty form is correct rather than a symbol-based guess.
    expect(MATIC.contractAddress).toBeDefined()

    const ui = renderSwap([MATIC], {
      symbol: MATIC.symbol,
      contractAddress: MATIC.contractAddress,
    })

    expect(ui.queryByTestId("selected_asset_button")).not.toBeInTheDocument()
  })
})
