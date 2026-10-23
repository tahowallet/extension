import { parseEnvBlock } from "../detect-env-block"

const fence = "```"

describe("parseEnvBlock", () => {
  it("keeps lines with allowed variable name prefixes", () => {
    const body = [
      "Some description.",
      "",
      "## Testing Env",
      "",
      fence,
      "ENABLE_THING=true",
      "USE_OTHER=1",
      "SHOW_PANEL=yes",
      "SUPPORT_FEATURE=on",
      fence,
    ].join("\n")

    expect(parseEnvBlock(body)).toEqual({
      block:
        "ENABLE_THING=true\nUSE_OTHER=1\nSHOW_PANEL=yes\nSUPPORT_FEATURE=on",
      droppedLines: 0,
    })
  })

  it("drops lines with other variable names", () => {
    const body = [
      "## Testing Environment",
      `${fence}sh`,
      "USE_OK=1",
      "BOAR_RPC_URL_ETHEREUM=https://attacker.example",
      "NODE_OPTIONS=--require=evil",
      fence,
    ].join("\n")

    expect(parseEnvBlock(body)).toEqual({ block: "USE_OK=1", droppedLines: 2 })
  })

  it("handles CRLF line endings", () => {
    const body = `## testing env\r\n${fence}\r\nUSE_A=1\r\nUSE_B=2\r\n${fence}\r\n`

    expect(parseEnvBlock(body).block).toBe("USE_A=1\nUSE_B=2")
  })

  it("returns an empty block when there's no testing env section", () => {
    expect(parseEnvBlock("## What\n\nJust a description.")).toEqual({
      block: "",
      droppedLines: 0,
    })
  })

  it("passes values through untouched, for writing to .env verbatim", () => {
    const body = ["## Testing Env", fence, "USE_X=$(touch pwned)", fence].join(
      "\n",
    )

    expect(parseEnvBlock(body).block).toBe("USE_X=$(touch pwned)")
  })
})
