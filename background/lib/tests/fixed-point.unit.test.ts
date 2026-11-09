import { parseToFixedPointNumber } from "../fixed-point"

jest.mock("../logger", () => ({
  __esModule: true,
  default: { debug: jest.fn() },
}))

describe("parseToFixedPointNumber", () => {
  it.each([
    ["1,234,567.89", { amount: 123456789n, decimals: 2 }],
    ["1,234,567,890", { amount: 1234567890n, decimals: 0 }],
    ["1,234.56", { amount: 123456n, decimals: 2 }],
    ["1234.56", { amount: 123456n, decimals: 2 }],
    ["0.00", { amount: 0n, decimals: 2 }],
    ["-1,234,567.89", { amount: -123456789n, decimals: 2 }],
    ["+1,234,567.89", { amount: 123456789n, decimals: 2 }],
  ])("parses %s without losing precision", (input, expected) => {
    expect(parseToFixedPointNumber(input)).toEqual(expected)
  })

  it.each([
    "",
    "1.2.3",
    "not a number",
    "1,,234",
    "12,34,567",
    "1,234,",
    "1,2,3",
    ",,123",
  ])("rejects %s", (input) => {
    expect(parseToFixedPointNumber(input)).toBeUndefined()
  })
})
