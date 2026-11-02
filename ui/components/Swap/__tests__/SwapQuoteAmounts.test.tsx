import React from "react"
import { ETH } from "@tallyho/tally-background/constants"
import { isValid0xSwapPriceResponse } from "@tallyho/tally-background/lib/validate"
import { LiquidSwapPrice } from "@tallyho/tally-background/lib/0x-swap-types"
import { createSmartContractAsset } from "@tallyho/tally-background/tests/factories"
import priceExactIn from "@tallyho/tally-background/lib/tests/fixtures/0x/price-exact-in.json"
import priceExactOut from "@tallyho/tally-background/lib/tests/fixtures/0x/price-exact-out.json"
import SwapQuoteAmounts from "../SwapQuoteAmounts"
import { getQuoteAmounts } from "../../../utils/swap"
import { renderWithProviders } from "../../../tests/test-utils"

const USDC = createSmartContractAsset({
  symbol: "USDC",
  decimals: 6,
  contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
})

function liquidPrice(fixture: unknown): LiquidSwapPrice {
  if (!isValid0xSwapPriceResponse(fixture) || !fixture.liquidityAvailable) {
    throw new Error("Expected a 0x price with liquidity.")
  }
  return fixture
}

const renderAmounts = (fixture: unknown) =>
  renderWithProviders(
    <SwapQuoteAmounts
      amounts={getQuoteAmounts(liquidPrice(fixture), ETH, USDC)}
      sellSymbol="ETH"
      buySymbol="USDC"
    />,
  )

describe("SwapQuoteAmounts", () => {
  it("should show an exact-in swap's estimate and minimum received", () => {
    const ui = renderAmounts(priceExactIn)

    expect(ui.getByText("You receive ≈ 239.56012 USDC")).toBeInTheDocument()
    expect(
      ui.getByText("Minimum received: 237.164519 USDC"),
    ).toBeInTheDocument()
    expect(ui.queryByText(/refunded/)).not.toBeInTheDocument()
  })

  it("should show an exact-out swap's exact output and bounded input", () => {
    const ui = renderAmounts(priceExactOut)

    expect(ui.getByText("You receive exactly 10 USDC")).toBeInTheDocument()
    // 0.004168821561967986 rounds down as an estimate; the 0.004217447417577789
    // ceiling rounds up so it stays a ceiling.
    expect(
      ui.getByText("You pay ≈ 0.00416882 ETH (at most 0.00421745)"),
    ).toBeInTheDocument()
    expect(
      ui.getByText("Any ETH the swap doesn't use is refunded."),
    ).toBeInTheDocument()
    expect(ui.queryByText(/Minimum received/)).not.toBeInTheDocument()
  })
})
