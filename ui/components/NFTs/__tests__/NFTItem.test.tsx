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
    const item = ui.container.getElementsByClassName("nft_item")[0]

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
    const icon = ui.container.getElementsByClassName("icon_network")[0]

    expect(icon).toBeInTheDocument()
    // styled-jsx renders CSS in <style> tags; check the rendered style content
    const styleContent = Array.from(ui.container.querySelectorAll("style"))
      .map((s) => s.textContent)
      .join("")
    expect(styleContent).toContain(iconUrl)
  })

  test("should zoom the image when the NFT item is hovered", async () => {
    const thumbnailURL = "thumbnailURL.svg"
    const nft = createNFT({ thumbnailURL })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const item = ui.container.getElementsByClassName("nft_image")[0]

    // styled-jsx applies transform via CSS class; check class presence
    expect(ui.getByRole("img").classList.contains("zoom")).toBe(false)
    await userEvent.hover(item)
    await waitFor(() =>
      expect(ui.getByRole("img").classList.contains("zoom")).toBe(true),
    )
  })

  test("should not display a floor price if the price is not available for the collection", () => {
    const nft = createNFTCollection()
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const price = ui.container.getElementsByClassName("nft_item_price")[0]

    expect(price).toBeUndefined()
  })

  test("should display a floor price if the price is available for the collection", () => {
    const floorPrice = { value: 0.003, tokenSymbol: "ETH" }
    const nft = createNFTCollection({ floorPrice })
    const ui = render(<NFTItem item={nft} onClick={onClick} />)
    const price = ui.container.getElementsByClassName("nft_item_price")[0]

    expect(price).toBeInTheDocument()
    expect(price).toHaveTextContent(
      `~${floorPrice.value} ${floorPrice.tokenSymbol}`,
    )
  })
})
