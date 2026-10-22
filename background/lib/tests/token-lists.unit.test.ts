import { isValidUniswapTokenListResponse } from "../validate"

const tokenList = (...tokens: { name: string; symbol: string }[]): unknown => ({
  name: "Test List",
  timestamp: "2026-01-01T00:00:00.000Z",
  version: { major: 1, minor: 0, patch: 0 },
  tokens: tokens.map(({ name, symbol }) => ({
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    name,
    symbol,
  })),
})

describe("Uniswap token list validation", () => {
  it("should accept a plain token list", () => {
    expect(
      isValidUniswapTokenListResponse(
        tokenList({ name: "USD Coin", symbol: "USDC" }),
      ),
    ).toBe(true)
  })

  // Symbols like `USD₮0` and names longer than 40 characters are legal per the
  // current token list spec, and appear on first-party lists (e.g. the
  // Superchain and Uniswap Labs Default lists). Rejecting them dropped entire
  // lists, leaving every asset unverified.
  it("should accept non-alphanumeric symbols and long names", () => {
    expect(
      isValidUniswapTokenListResponse(
        tokenList({
          name: "Across Protocol Token (Celo native bridge)",
          symbol: "USD₮0",
        }),
      ),
    ).toBe(true)
  })

  it("should reject a payload that is not a token list", () => {
    expect(
      isValidUniswapTokenListResponse([
        { name: "Popular Tokens", listURI: "example.com/popular.json" },
      ]),
    ).toBe(false)
  })
})
