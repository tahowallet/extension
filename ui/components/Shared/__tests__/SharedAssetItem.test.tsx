import React from "react"
import { MATIC, POLYGON } from "@tallyho/tally-background/constants"
import { SmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import SharedAssetItem from "../SharedAssetItem"
import { renderWithProviders } from "../../../tests/test-utils"

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

const explorerIcon = (container: HTMLElement) =>
  container.querySelector(".right_content button.icon")

describe("SharedAssetItem", () => {
  // MATIC on Polygon (like ETH on Optimism) is a network base asset that also
  // carries a contract address; it has no token page to link to.
  it("does not offer a token page link for a base asset", () => {
    expect(MATIC.contractAddress).toBeDefined()

    const ui = renderWithProviders(
      <SharedAssetItem
        assetAndAmount={{ asset: MATIC }}
        currentNetwork={POLYGON}
      />,
    )

    expect(explorerIcon(ui.container)).toBeNull()
  })

  it("offers a token page link for a smart contract asset", () => {
    const ui = renderWithProviders(
      <SharedAssetItem
        assetAndAmount={{ asset: WMATIC }}
        currentNetwork={POLYGON}
      />,
    )

    expect(explorerIcon(ui.container)).not.toBeNull()
  })
})
