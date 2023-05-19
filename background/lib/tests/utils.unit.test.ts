import { truncateDecimalAmount } from "../utils"

type TruncateDecimalAmountType = [
  number | string,
  number,
  number | undefined,
  string
]

const integersCases: TruncateDecimalAmountType[] = [
  [1, 0, undefined, "1"],
  [1, 2, undefined, "1"],
  [1, 2, 3, "1"],
]

const noLeadingZeros: TruncateDecimalAmountType[] = [
  [0.123, 0, 5, "0"],
  [0.123, 1, 5, "0.1"],
  [0.123, 2, 5, "0.12"],
  [0.123, 3, 5, "0.123"],
  [1.123, 0, 5, "1"],
  [1.123, 1, 5, "1.1"],
  [1.123, 2, 5, "1.12"],
  [1.123, 3, 5, "1.123"],
  [0.123, 0, undefined, "0"],
  [0.123, 1, undefined, "0.1"],
  [0.123, 2, undefined, "0.12"],
  [0.123, 3, undefined, "0.123"],
  [1.123, 0, undefined, "1"],
  [1.123, 1, undefined, "1.1"],
  [1.123, 2, undefined, "1.12"],
  [1.123, 3, undefined, "1.123"],
]

const zeroWithLeadingZeros: TruncateDecimalAmountType[] = [
  [0.00123, 0, undefined, "0"],
  [0.00123, 1, undefined, "0"],
  [0.00123, 2, undefined, "0"],
  [0.00123, 3, undefined, "0.001"],
  [0.00123, 4, undefined, "0.0012"],

  [0.00123, 0, 5, "0"],
  [0.00123, 1, 5, "0.001"],
  [0.00123, 2, 5, "0.001"],
  [0.00123, 3, 5, "0.001"],
  [0.00123, 4, 5, "0.0012"],
]

const nonZeroWithLeadingZeros: TruncateDecimalAmountType[] = [
  [1.00123, 0, undefined, "1"],
  [1.00123, 1, undefined, "1"],
  [1.00123, 2, undefined, "1"],
  [1.00123, 3, undefined, "1.001"],
  [1.00123, 4, undefined, "1.0012"],

  [1.00123, 0, 5, "1"],
  [1.00123, 1, 5, "1"],
  [1.00123, 2, 5, "1"],
  [1.00123, 3, 5, "1.001"],
  [1.00123, 4, 5, "1.0012"],
]

describe("Lib Utils", () => {
  describe(truncateDecimalAmount, () => {
    it.each(integersCases)(
      "given integer should return integer",
      (value, decimalLength, maxDecimalLength, expected) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength)
        ).toBe(expected)
      }
    )

    it.each(noLeadingZeros)(
      "given number with no leading zeros in decimal part should truncate at desired length",
      (value, decimalLength, maxDecimalLength, expected) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength)
        ).toBe(expected)
      }
    )

    it.each(zeroWithLeadingZeros)(
      "given number <1 with leading zeros should increase precision",
      (value, decimalLength, maxDecimalLength, expected) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength)
        ).toBe(expected)
      }
    )

    it.each(nonZeroWithLeadingZeros)(
      "given number >=1 with leading zeros should should truncate at desired length",
      (value, decimalLength, maxDecimalLength, expected) => {
        expect(
          truncateDecimalAmount(value, decimalLength, maxDecimalLength)
        ).toBe(expected)
      }
    )
  })
})
