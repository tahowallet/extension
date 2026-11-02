import React from "react"
import NFTPreview from "../NFTPreview"
import { createNFT, createNFTCollection } from "../../../tests/factories"
import { renderWithProviders } from "../../../tests/test-utils"

describe("NFTPreview", () => {
  test("should show the floor price a collection has", () => {
    const ui = renderWithProviders(
      <NFTPreview
        nft={createNFT({ name: "Fox" })}
        collection={createNFTCollection({
          floorPrice: { value: 0.5, tokenSymbol: "ETH" },
        })}
      />,
    )

    expect(ui.getByText("Floor price")).toBeInTheDocument()
    expect(ui.getByText("~0.5 ETH")).toBeInTheDocument()
  })

  test("should hide the floor price a collection doesn't have", () => {
    const ui = renderWithProviders(
      <NFTPreview
        nft={createNFT({ name: "Fox" })}
        collection={createNFTCollection()}
      />,
    )

    expect(ui.getByText("Fox")).toBeInTheDocument()
    expect(ui.queryByText("Floor price")).not.toBeInTheDocument()
  })

  test("should hide the rarity rank an NFT doesn't have", () => {
    const ui = renderWithProviders(
      <NFTPreview
        nft={createNFT({ name: "Fox", rarityRank: null })}
        collection={createNFTCollection()}
      />,
    )

    expect(ui.queryByText(/Rank/)).not.toBeInTheDocument()
  })
})
