import { isHexString, toHexString, toOptionalHexString } from "../utils/hex"

describe("HexString helpers", () => {
  it("accepts 0x-prefixed hex, including empty data", () => {
    expect(isHexString("0x")).toBe(true)
    expect(isHexString("0xdeadBEEF")).toBe(true)
    expect(toHexString("0x01")).toBe("0x01")
  })

  it("rejects anything else", () => {
    expect(isHexString("deadbeef")).toBe(false)
    expect(isHexString("0xnothex")).toBe(false)
    expect(isHexString(1)).toBe(false)
    expect(
      isHexString(
        "sparkrt1pgssy6vty7krpze82ecm8j39gd35v35aqjjmhftc4culawsavkyh564u2uv8v0",
      ),
    ).toBe(false)
    expect(() => toHexString("spark1abc")).toThrow(/hex/)
  })

  it("passes optional values through", () => {
    expect(toOptionalHexString(undefined)).toBeUndefined()
    expect(toOptionalHexString(null)).toBeUndefined()
    expect(toOptionalHexString("0xab")).toBe("0xab")
  })
})
