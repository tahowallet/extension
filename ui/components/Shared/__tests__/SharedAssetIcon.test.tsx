import React from "react"
import { render } from "@testing-library/react"
import SharedAssetIcon from "../SharedAssetIcon"

describe("SharedAssetIcon", () => {
  test("should render asset icon", () => {
    const ui = render(
      <SharedAssetIcon
        size="small"
        symbol="USDC"
        logoURL="http://localhost:8097/supercoolassetlogo.jpg"
      />,
    )

    expect(ui.getByRole("img")).toBeInTheDocument()
    expect(ui.getByRole("img")).toBeVisible()
  })

  test("should handle assets with invalid symbols", () => {
    const ui = render(
      <SharedAssetIcon
        size="small"
        symbol=""
        logoURL="http://localhost:8097/supercoolassetlogo.jpg"
      />,
    )

    expect(ui.getByRole("img")).toBeInTheDocument()
    expect(ui.getByRole("img")).toBeVisible()
    expect(ui.getByText("?")).toBeVisible()
  })

  test("should use the built-in icon for a trusted asset's symbol", () => {
    const ui = render(<SharedAssetIcon size="small" symbol="ETH" logoURL="" />)

    expect(ui.queryByText("E")).toBeNull()
  })

  test("should not let an untrusted asset borrow a built-in icon", () => {
    const ui = render(
      <SharedAssetIcon size="small" symbol="ETH" logoURL="" untrusted />,
    )

    expect(ui.getByText("E")).toBeVisible()
  })
})
