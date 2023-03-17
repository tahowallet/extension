import React from "react"
import { render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NFTItem from "../NFTItem"
import { createNFT, createNFTCollection } from "../../../tests/factories"
import { noPreviewLink } from "../NFTImage"

const onClick = jest.fn()

describe("NFTItem", () => {
  test("should render a component", () => {
    const nft = createNFT()
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const item = ui.getByTestId("nft_list_item_single")

    expect(item).toBeInTheDocument()
  })

  test("should display a thumbnail image", () => {
    const thumbnailURL = "thumbnailURL.svg"
    const nft = createNFT({ thumbnailURL })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const thumbnail = ui.getByRole("img")

    expect(thumbnail).toBeInTheDocument()
    expect(thumbnail).toHaveAttribute("src", thumbnailURL)
  })

  test("should display a default image when the thumbnail URL is empty", () => {
    const nft = createNFT({ thumbnailURL: "" })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const thumbnail = ui.getByRole("img")

    expect(thumbnail).toBeInTheDocument()
    expect(thumbnail).toHaveAttribute("src", noPreviewLink)
  })

  test("should display a NFT name", () => {
    const name = "Test name"
    const nft = createNFT({ name })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const title = ui.getByText(name)

    expect(title).toBeInTheDocument()
  })

  test("should display a default text when the NFT name is empty", () => {
    const nft = createNFT({ name: "" })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const title = ui.getByText("No title")

    expect(title).toBeInTheDocument()
  })

  test("should display the correct icon for the network", () => {
    const iconUrl = "ethereum-square@2x.png"
    const nft = createNFT()
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const icon = ui.getByTestId("icon_network")

    expect(icon).toBeInTheDocument()
    expect(icon).toHaveStyle(`background: url(./images/networks/${iconUrl})`)
  })

  test("should zoom the image when the NFT item is hovered", async () => {
    const thumbnailURL = "thumbnailURL.svg"
    const nft = createNFT({ thumbnailURL })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const item = ui.getByTestId("nft_image")

    expect(ui.getByRole("img")).toHaveStyle("transform: scale(1)")
    await userEvent.hover(item)
    await waitFor(() =>
      expect(ui.getByRole("img")).toHaveStyle("transform: scale(1.5)")
    )
  })

  test("should not display a floor price if the price is not available for the collection", () => {
    const nft = createNFTCollection()
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const price = ui.queryByTestId("nft_item_price")

    expect(price).not.toBeInTheDocument()
  })

  test("should display a floor price if the price is available for the collection", () => {
    const floorPrice = { value: 0.003, tokenSymbol: "ETH" }
    const nft = createNFTCollection({ floorPrice })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const price = ui.queryByTestId("nft_item_price")

    expect(price).toBeInTheDocument()
    expect(price).toHaveTextContent(
      `~${floorPrice.value} ${floorPrice.tokenSymbol}`
    )
  })
})
