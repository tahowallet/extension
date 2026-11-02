import { displayAmount, displayAssetAmount } from "../amounts"

const fixed = (decimalString: string, decimals: number) => {
  const [integer, fraction = ""] = decimalString.split(".")
  return {
    amount: BigInt(integer + fraction.padEnd(decimals, "0")),
    decimals,
  }
}

describe("displayAmount", () => {
  it("leaves ordinary amounts as localized", () => {
    expect(displayAmount(fixed("3876.23", 18), "3,876.23", "en")).toEqual({
      text: "3,876.23",
    })
    expect(displayAmount(123456.78, "123,456.78", "en")).toEqual({
      text: "123,456.78",
    })
  })

  it("formats ordinary amounts itself without a localized string", () => {
    expect(displayAmount(1234.5, undefined, "en")).toEqual({ text: "1,234.5" })
    expect(displayAmount(0.000012, undefined, "en")).toEqual({ text: "0" })
  })

  it("switches to compact notation from a million", () => {
    expect(displayAmount(999999.99, "999,999.99", "en").text).toBe("999,999.99")
    expect(displayAmount(1234567.89, "1,234,567.89", "en")).toEqual({
      text: "1.23M",
      title: "1,234,567.89",
    })
    expect(displayAmount(fixed("13245678.9", 6), "x", "en")).toEqual({
      text: "13.2M",
      title: "13,245,678.9",
    })
    expect(displayAmount(fixed("3182832498524.191", 3), "x", "en")).toEqual({
      text: "3.18T",
      title: "3,182,832,498,524.191",
    })
  })

  it("switches to scientific notation past compact notation's units", () => {
    expect(displayAmount(fixed("99999999999999", 0), "x", "en").text).toBe(
      "100T",
    )
    expect(displayAmount(fixed("123456789012345", 0), "x", "en").text).toBe(
      "1.23E14",
    )
  })

  it("keeps every digit of absurd amounts for the title", () => {
    const amount = fixed("3182832498524191234567890123456789.012345", 6)
    expect(displayAmount(amount, "x", "en")).toEqual({
      text: "3.18E33",
      title: "3,182,832,498,524,191,234,567,890,123,456,789.012345",
    })
  })

  it("follows the locale", () => {
    const amount = fixed("3182832498524.5", 1)
    expect(displayAmount(amount, "x", "de")).toEqual({
      // German puts a no-break space before the unit.
      text: "3,18\u00a0Bio.",
      title: "3.182.832.498.524,5",
    })
    expect(displayAmount(amount, "x", "ja").text).toBe("3.18兆")
  })

  it("handles negative amounts", () => {
    expect(displayAmount(fixed("-13245678", 0), "x", "en")).toEqual({
      text: "-13.2M",
      title: "-13,245,678",
    })
    expect(displayAmount(-1.5, "-1.5", "en")).toEqual({ text: "-1.5" })
  })

  it("leaves non-finite numbers alone", () => {
    expect(displayAmount(Infinity, "∞", "en")).toEqual({ text: "∞" })
  })
})

describe("displayAssetAmount", () => {
  it("uses the asset's decimals", () => {
    const asset = { name: "Spam", symbol: "SPAM", decimals: 6 }
    expect(
      displayAssetAmount(
        {
          asset,
          amount: 13245678900000n,
          localizedDecimalAmount: "13,245,678.9",
        },
        "en",
      ),
    ).toEqual({ text: "13.2M", title: "13,245,678.9" })
    expect(
      displayAssetAmount(
        { asset, amount: 1500000n, localizedDecimalAmount: "1.5" },
        "en",
      ),
    ).toEqual({ text: "1.5" })
  })
})
