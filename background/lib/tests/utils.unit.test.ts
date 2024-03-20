import { truncateDecimalAmount } from "../utils"

type TruncateDecimalAmountType = {
  value: number | string
  decimalLength: number
  maxDecimalLength?: number
  expected: string
}

const integersCases: TruncateDecimalAmountType[] = [
  { value: 0, decimalLength: 0, expected: "0" },
  { value: 1, decimalLength: 0, expected: "1" },
  { value: 1, decimalLength: 2, expected: "1" },
  { value: 1, decimalLength: 2, maxDecimalLength: 3, expected: "1" },

  { value: "0", decimalLength: 0, expected: "0" },
  { value: "1", decimalLength: 0, expected: "1" },
  { value: "1", decimalLength: 2, expected: "1" },
  { value: "1", decimalLength: 2, maxDecimalLength: 3, expected: "1" },
]

const noLeadingZeros: TruncateDecimalAmountType[] = [
  { value: 0.123, decimalLength: 0, maxDecimalLength: 5, expected: "0.1" },
  { value: 0.123, decimalLength: 1, maxDecimalLength: 5, expected: "0.1" },
  { value: 0.123, decimalLength: 2, maxDecimalLength: 5, expected: "0.12" },
  { value: 0.123, decimalLength: 3, maxDecimalLength: 5, expected: "0.123" },

  { value: 1.123, decimalLength: 0, maxDecimalLength: 5, expected: "1" },
  { value: 1.123, decimalLength: 1, maxDecimalLength: 5, expected: "1.1" },
  { value: 1.123, decimalLength: 2, maxDecimalLength: 5, expected: "1.12" },
  { value: 1.123, decimalLength: 3, maxDecimalLength: 5, expected: "1.123" },

  { value: 0.123, decimalLength: 0, expected: "0" },
  { value: 0.123, decimalLength: 1, expected: "0.1" },
  { value: 0.123, decimalLength: 2, expected: "0.12" },
  { value: 0.123, decimalLength: 3, expected: "0.123" },

  { value: 1.123, decimalLength: 0, expected: "1" },
  { value: 1.123, decimalLength: 1, expected: "1.1" },
  { value: 1.123, decimalLength: 2, expected: "1.12" },
  { value: 1.123, decimalLength: 3, expected: "1.123" },

  { value: "0.123", decimalLength: 0, maxDecimalLength: 5, expected: "0.1" },
  { value: "0.123", decimalLength: 3, maxDecimalLength: 5, expected: "0.123" },
  { value: "1.123", decimalLength: 0, maxDecimalLength: 5, expected: "1" },
  { value: "1.123", decimalLength: 3, maxDecimalLength: 5, expected: "1.123" },
  { value: "0.123", decimalLength: 0, expected: "0" },
  { value: "0.123", decimalLength: 3, expected: "0.123" },
  { value: "1.123", decimalLength: 0, expected: "1" },
  { value: "1.123", decimalLength: 3, expected: "1.123" },
]

const zeroWithLeadingZeros: TruncateDecimalAmountType[] = [
  { value: 0.00123, decimalLength: 0, expected: "0" },
  { value: 0.00123, decimalLength: 1, expected: "0" },
  { value: 0.00123, decimalLength: 2, expected: "0" },
  { value: 0.00123, decimalLength: 3, expected: "0.001" },
  { value: 0.00123, decimalLength: 4, expected: "0.0012" },

  { value: 0.00123, decimalLength: 0, maxDecimalLength: 5, expected: "0.001" },
  { value: 0.00123, decimalLength: 1, maxDecimalLength: 5, expected: "0.001" },
  { value: 0.00123, decimalLength: 2, maxDecimalLength: 5, expected: "0.001" },
  { value: 0.00123, decimalLength: 3, maxDecimalLength: 5, expected: "0.001" },
  { value: 0.00123, decimalLength: 4, maxDecimalLength: 5, expected: "0.0012" },

  { value: 0.0001, decimalLength: 1, maxDecimalLength: 1, expected: "0" },
  { value: 0.0001, decimalLength: 1, maxDecimalLength: 2, expected: "0" },
  { value: 0.0001, decimalLength: 1, maxDecimalLength: 3, expected: "0" },
  { value: 0.0001, decimalLength: 1, maxDecimalLength: 4, expected: "0.0001" },
  { value: 0.0001, decimalLength: 1, maxDecimalLength: 5, expected: "0.0001" },

  { value: "0.00123", decimalLength: 0, expected: "0" },
  { value: "0.00123", decimalLength: 3, expected: "0.001" },
  { value: "0.00123", decimalLength: 4, expected: "0.0012" },
  {
    value: "0.00123",
    decimalLength: 0,
    maxDecimalLength: 5,
    expected: "0.001",
  },
  {
    value: "0.0001",
    decimalLength: 1,
    maxDecimalLength: 5,
    expected: "0.0001",
  },
]

const nonZeroWithLeadingZeros: TruncateDecimalAmountType[] = [
  { value: 1.00123, decimalLength: 0, expected: "1" },
  { value: 1.00123, decimalLength: 1, expected: "1" },
  { value: 1.00123, decimalLength: 2, expected: "1" },
  { value: 1.00123, decimalLength: 3, expected: "1.001" },
  { value: 1.00123, decimalLength: 4, expected: "1.0012" },

  { value: 1.00123, decimalLength: 0, maxDecimalLength: 5, expected: "1" },
  { value: 1.00123, decimalLength: 1, maxDecimalLength: 5, expected: "1" },
  { value: 1.00123, decimalLength: 2, maxDecimalLength: 5, expected: "1" },
  { value: 1.00123, decimalLength: 3, maxDecimalLength: 5, expected: "1.001" },
  { value: 1.00123, decimalLength: 4, maxDecimalLength: 5, expected: "1.0012" },

  { value: "1.00123", decimalLength: 0, expected: "1" },
  { value: "1.00123", decimalLength: 4, expected: "1.0012" },
  { value: "1.00123", decimalLength: 0, maxDecimalLength: 5, expected: "1" },
  {
    value: "1.00123",
    decimalLength: 4,
    maxDecimalLength: 5,
    expected: "1.0012",
  },
]

describe("Lib Utils", () => {
  describe(truncateDecimalAmount, () => {
    it.each(integersCases)(
      "given integer should return integer",
      ({ value, decimalLength, maxDecimalLength, expected }) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength),
        ).toBe(expected)
      },
    )

    it.each(noLeadingZeros)(
      "given number with no leading zeros in decimal part should truncate at desired length",
      ({ value, decimalLength, maxDecimalLength, expected }) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength),
        ).toBe(expected)
      },
    )

    it.each(zeroWithLeadingZeros)(
      "given number <1 with leading zeros should increase precision",
      ({ value, decimalLength, maxDecimalLength, expected }) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength),
        ).toBe(expected)
      },
    )

    it.each(nonZeroWithLeadingZeros)(
      "given number >=1 with leading zeros should truncate at desired length",
      ({ value, decimalLength, maxDecimalLength, expected }) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength),
        ).toBe(expected)
      },
    )
  })
})
