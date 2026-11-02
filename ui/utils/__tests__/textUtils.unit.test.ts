import { trimNameMiddle } from "../textUtils"

describe("trimNameMiddle", () => {
  it("leaves names that fit alone", () => {
    expect(trimNameMiddle("testertesting.eth", 18)).toBe("testertesting.eth")
  })

  it("cuts the middle and keeps a short suffix whole", () => {
    const trimmed = trimNameMiddle("averyveryverylongname.eth", 18)
    expect(trimmed).toBe("averyveryv…ame.eth")
    expect(trimmed.length).toBeLessThanOrEqual(18)
  })

  it("treats a long final segment as part of the name", () => {
    const trimmed = trimNameMiddle("someone.verylongsubdomain", 18)
    expect(trimmed.endsWith("ain")).toBe(true)
    expect(trimmed.length).toBeLessThanOrEqual(18)
  })

  it("handles names without a dot", () => {
    expect(trimNameMiddle("abcdefghijklmnopqrstuvwxyz", 10)).toBe("abcdef…xyz")
  })
})
