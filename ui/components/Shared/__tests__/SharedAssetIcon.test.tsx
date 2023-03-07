import React from "react"
import { render } from "@testing-library/react"
import SharedAssetIcon from "../SharedAssetIcon"

describe("SharedAssetIcon", () => {
  test("smoke test", async () => {
    const ui = render(
      <SharedAssetIcon
        size="small"
        symbol="USDC"
        logoURL="http://localhost:8097/supercoolassetlogo.jpg"
      />
    )

    expect(ui.getByRole("img")).toBeInTheDocument()
    expect(ui.getByRole("img")).toBeVisible()
  })

  test("should handle assets with invalid symbols", async () => {
    const ui = render(
      <SharedAssetIcon
        size="small"
        symbol=""
        logoURL="http://localhost:8097/supercoolassetlogo.jpg"
      />
    )

    expect(ui.getByRole("img")).toBeInTheDocument()
    expect(ui.getByRole("img")).toBeVisible()
  })
})
