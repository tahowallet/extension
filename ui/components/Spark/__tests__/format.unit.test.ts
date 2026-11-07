import { parseSats } from "../format"

describe("parseSats", () => {
  it("parses whole positive sats only", () => {
    expect(parseSats("1,000")).toBe(1000)
    expect(parseSats(" 42 ")).toBe(42)
    expect(parseSats("0")).toBeUndefined()
    expect(parseSats("1.5")).toBeUndefined()
    expect(parseSats("-3")).toBeUndefined()
    expect(parseSats("9007199254740993")).toBeUndefined()
  })
})
