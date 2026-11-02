import { describe, expect, it } from "bun:test"
import { endpointLabel, redactedHost, redactUrls } from "../endpoint-label"

describe("redactedHost", () => {
  it.each([
    ["a key in the path", "https://eth-mainnet.g.alchemy.com/v2/SECRETKEY123"],
    ["a key in the query", "https://eth-mainnet.g.alchemy.com/?apikey=SECRET"],
    ["a key in both", "https://eth-mainnet.g.alchemy.com/v2/SECRET?key=MORE"],
    ["credentials", "https://user:SECRET@eth-mainnet.g.alchemy.com/rpc"],
    ["a fragment", "https://eth-mainnet.g.alchemy.com/#SECRET"],
  ])("keeps only the host of a URL with %s", (_, url) => {
    expect(redactedHost(url)).toBe("eth-mainnet.g.alchemy.com")
  })

  it.each([
    ["wss", "wss://mainnet.infura.io/ws/v3/SECRET", "mainnet.infura.io"],
    ["ws", "ws://localhost:8546/SECRET", "localhost:8546"],
    ["http", "http://127.0.0.1:8545/?key=SECRET", "127.0.0.1:8545"],
  ])("handles %s URLs, keeping the port", (_, url, host) => {
    expect(redactedHost(url)).toBe(host)
  })

  it("never echoes something it can't parse", () => {
    expect(redactedHost("not a url SECRET")).toBe("(unparseable URL)")
    expect(redactedHost(undefined)).toBe("(no URL)")
  })
})

describe("endpointLabel", () => {
  it("names the chain, kind, index and host", () => {
    expect(
      endpointLabel(
        "8453",
        "standard",
        1,
        "https://base-mainnet.g.alchemy.com/v2/SECRET",
      ),
    ).toBe("chain 8453 standard[1] base-mainnet.g.alchemy.com")
  })
})

describe("redactUrls", () => {
  it("cuts every URL in a message down to its host", () => {
    const message =
      'missing response (requestMethod="POST", url="https://eth-mainnet.g.alchemy.com/v2/SECRET", ' +
      "fallback=wss://mainnet.infura.io/ws/v3/OTHER?x=1, code=SERVER_ERROR)"

    const redacted = redactUrls(message)

    expect(redacted).not.toContain("SECRET")
    expect(redacted).not.toContain("OTHER")
    expect(redacted).toBe(
      'missing response (requestMethod="POST", url="eth-mainnet.g.alchemy.com", ' +
        "fallback=mainnet.infura.io, code=SERVER_ERROR)",
    )
  })
})
