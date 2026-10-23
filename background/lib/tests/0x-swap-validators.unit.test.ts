import {
  isValid0xSwapPriceResponse,
  isValid0xSwapQuoteResponse,
} from "../validate"
import priceExactIn from "./fixtures/0x/price-exact-in.json"
import priceExactOut from "./fixtures/0x/price-exact-out.json"
import priceNoLiquidity from "./fixtures/0x/price-no-liquidity.json"
import quoteExactIn from "./fixtures/0x/quote-exact-in.json"
import quoteExactOut from "./fixtures/0x/quote-exact-out.json"

// The fixtures are live 0x responses for ETH -> USDC on mainnet.
describe("0x swap response validation", () => {
  it.each([
    ["exact-in price", priceExactIn],
    ["exact-out price", priceExactOut],
    ["price without liquidity", priceNoLiquidity],
  ])("should accept an %s", (_, response) => {
    expect(isValid0xSwapPriceResponse(response)).toBe(true)
  })

  it.each([
    ["exact-in quote", quoteExactIn],
    ["exact-out quote", quoteExactOut],
    ["quote without liquidity", priceNoLiquidity],
  ])("should accept an %s", (_, response) => {
    expect(isValid0xSwapQuoteResponse(response)).toBe(true)
  })

  it("should accept fields 0x adds later", () => {
    expect(
      isValid0xSwapQuoteResponse({
        ...quoteExactOut,
        newTopLevelField: "new",
        fees: { ...quoteExactOut.fees, newFee: null },
      }),
    ).toBe(true)
  })

  it("should reject a price whose amounts aren't numeric strings", () => {
    expect(
      isValid0xSwapPriceResponse({ ...priceExactIn, sellAmount: 100 }),
    ).toBe(false)
    expect(
      isValid0xSwapPriceResponse({ ...priceExactIn, sellAmount: "lots" }),
    ).toBe(false)
  })

  it("should reject an exact-out quote without its max sell amount", () => {
    const { maxSellAmount: _maxSellAmount, ...withoutMaxSellAmount } =
      quoteExactOut

    expect(isValid0xSwapQuoteResponse(withoutMaxSellAmount)).toBe(false)
  })

  it("should reject a quote without a transaction", () => {
    const { transaction: _transaction, ...withoutTransaction } = quoteExactIn

    expect(isValid0xSwapQuoteResponse(withoutTransaction)).toBe(false)
  })

  it("should narrow to the exact-out shape by liquidity and mode", () => {
    const response: unknown = quoteExactOut

    if (
      !isValid0xSwapQuoteResponse(response) ||
      !response.liquidityAvailable ||
      response.mode !== "exact-out"
    ) {
      throw new Error("Expected a valid exact-out quote.")
    }

    expect(response.maxSellAmount).toBe("4217447417577789")
    expect(response.routes.forward.fills.length).toBeGreaterThan(0)
  })
})
