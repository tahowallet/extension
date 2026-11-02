import { MINUTE } from "../../../constants"
import {
  fetchTokenMetadataJSON,
  HostBackoff,
  MetadataFetchError,
  normalizeMediaURL,
  retryDelay,
  tokenMetadataFromJSON,
} from "../metadata"

const METADATA = { name: "Fox #1", image: "ipfs://QmImage/1.png" }
const CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), init)

const fetchAnswering = (response: () => Response) => {
  const fetchStub = jest.fn(async (_url: string, _init?: RequestInit) =>
    response(),
  )
  return { fetchStub, fetch: fetchStub as unknown as typeof fetch }
}

describe("fetchTokenMetadataJSON", () => {
  it("fetches ipfs:// URIs through the IPFS gateway", async () => {
    const { fetchStub, fetch } = fetchAnswering(() => jsonResponse(METADATA))

    await expect(
      fetchTokenMetadataJSON(`ipfs://${CID}/1.json`, { fetch }),
    ).resolves.toEqual(METADATA)
    expect(fetchStub.mock.calls[0][0]).toBe(
      `https://ipfs.io/ipfs/${CID}/1.json`,
    )
  })

  it("drops a repeated ipfs/ namespace", async () => {
    const { fetchStub, fetch } = fetchAnswering(() => jsonResponse(METADATA))

    await fetchTokenMetadataJSON(`ipfs://ipfs/${CID}`, { fetch })

    expect(fetchStub.mock.calls[0][0]).toBe(`https://ipfs.io/ipfs/${CID}`)
  })

  it("fetches ar:// URIs through the Arweave gateway", async () => {
    const { fetchStub, fetch } = fetchAnswering(() => jsonResponse(METADATA))

    await fetchTokenMetadataJSON("ar://abc123/1", { fetch })

    expect(fetchStub.mock.calls[0][0]).toBe("https://arweave.net/abc123/1")
  })

  it("fetches http(s) URIs as they are", async () => {
    const { fetchStub, fetch } = fetchAnswering(() => jsonResponse(METADATA))

    await fetchTokenMetadataJSON("https://api.example.com/token/1", { fetch })

    expect(fetchStub.mock.calls[0][0]).toBe("https://api.example.com/token/1")
  })

  it("reads base64 data URIs inline", async () => {
    const { fetchStub, fetch } = fetchAnswering(() => jsonResponse({}))
    const encoded = Buffer.from(
      JSON.stringify({ name: "Fox ü" }),
      "utf8",
    ).toString("base64")

    await expect(
      fetchTokenMetadataJSON(`data:application/json;base64,${encoded}`, {
        fetch,
      }),
    ).resolves.toEqual({ name: "Fox ü" })
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it("reads utf8 data URIs inline, encoded or not", async () => {
    await expect(
      fetchTokenMetadataJSON(
        `data:application/json;utf8,${JSON.stringify(METADATA)}`,
      ),
    ).resolves.toEqual(METADATA)
    await expect(
      fetchTokenMetadataJSON(
        `data:application/json;utf8,${encodeURIComponent(JSON.stringify(METADATA))}`,
      ),
    ).resolves.toEqual(METADATA)
    await expect(
      fetchTokenMetadataJSON(
        `data:application/json,${encodeURIComponent(JSON.stringify(METADATA))}`,
      ),
    ).resolves.toEqual(METADATA)
  })

  it("rejects unreadable data URIs", async () => {
    await expect(
      fetchTokenMetadataJSON("data:application/json;utf8,{not json"),
    ).rejects.toBeInstanceOf(MetadataFetchError)
  })

  it("rejects unsupported schemes", async () => {
    await expect(fetchTokenMetadataJSON("ftp://example.com/1")).rejects.toThrow(
      /Unsupported/,
    )
  })

  it("names the host of a broken server", async () => {
    const { fetch } = fetchAnswering(() => new Response("", { status: 502 }))

    const error = await fetchTokenMetadataJSON("https://broken.example/1", {
      fetch,
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(MetadataFetchError)
    expect((error as MetadataFetchError).host).toBe("broken.example")
  })

  it("names the host of an unreachable server", async () => {
    const fetchStub = jest.fn(async () => {
      throw new TypeError("Failed to fetch")
    })

    const error = await fetchTokenMetadataJSON("https://down.example/1", {
      fetch: fetchStub as unknown as typeof fetch,
    }).catch((caught: unknown) => caught)

    expect((error as MetadataFetchError).host).toBe("down.example")
  })

  it("gives up on a server that doesn't answer in time", async () => {
    const fetchStub = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          )
        }),
    )

    await expect(
      fetchTokenMetadataJSON("https://slow.example/1", {
        fetch: fetchStub as unknown as typeof fetch,
        timeoutMs: 5,
      }),
    ).rejects.toBeInstanceOf(MetadataFetchError)
  })

  it("refuses responses over the size cap", async () => {
    const big = { name: "x".repeat(200) }
    const { fetch: declared } = fetchAnswering(() =>
      jsonResponse(big, { headers: { "content-length": "100000" } }),
    )
    const { fetch: streamed } = fetchAnswering(() => jsonResponse(big))

    await expect(
      fetchTokenMetadataJSON("https://big.example/1", {
        fetch: declared,
        maxBytes: 100,
      }),
    ).rejects.toThrow(/too big/)
    await expect(
      fetchTokenMetadataJSON("https://big.example/1", {
        fetch: streamed,
        maxBytes: 100,
      }),
    ).rejects.toThrow(/too big/)
  })
})

describe("tokenMetadataFromJSON", () => {
  it("maps name, description, image and attributes", () => {
    expect(
      tokenMetadataFromJSON({
        name: "Fox #1",
        description: "A fox.",
        image: `ipfs://${CID}`,
        attributes: [
          { trait_type: "Fur", value: "Red" },
          { trait_type: "Tails", value: 9 },
          { value: "no trait" },
          "junk",
        ],
      }),
    ).toEqual({
      name: "Fox #1",
      description: "A fox.",
      image: `https://ipfs.io/ipfs/${CID}`,
      attributes: [
        { trait: "Fur", value: "Red" },
        { trait: "Tails", value: "9" },
      ],
    })
  })

  it("falls back to image_url and inline SVG", () => {
    expect(
      tokenMetadataFromJSON({ image_url: "https://img.example/1.png" }).image,
    ).toBe("https://img.example/1.png")
    expect(tokenMetadataFromJSON({ image_data: "<svg></svg>" }).image).toBe(
      `data:image/svg+xml;utf8,${encodeURIComponent("<svg></svg>")}`,
    )
  })

  it("leaves out what isn't there", () => {
    expect(tokenMetadataFromJSON("nonsense")).toEqual({ attributes: [] })
    expect(tokenMetadataFromJSON({ image: "nonsense" }).image).toBeUndefined()
  })
})

describe("normalizeMediaURL", () => {
  it("routes storage URLs through gateways and keeps the rest", () => {
    expect(normalizeMediaURL("ar://abc/1.png")).toBe(
      "https://arweave.net/abc/1.png",
    )
    expect(normalizeMediaURL("data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA",
    )
    expect(normalizeMediaURL(42)).toBeUndefined()
  })
})

describe("HostBackoff", () => {
  it("leaves a host alone after failures in a row, until it has waited", () => {
    const backoff = new HostBackoff()
    backoff.recordFailure("broken.example", 0)
    expect(backoff.isBackingOff("broken.example", 1)).toBe(false)

    backoff.recordFailure("broken.example", 0)
    expect(backoff.isBackingOff("broken.example", 1)).toBe(true)
    expect(backoff.isBackingOff("other.example", 1)).toBe(false)
    expect(backoff.isBackingOff("broken.example", 60 * MINUTE)).toBe(false)
  })

  it("forgets failures after a success", () => {
    const backoff = new HostBackoff()
    backoff.recordFailure("flaky.example", 0)
    backoff.recordSuccess("flaky.example")
    backoff.recordFailure("flaky.example", 0)
    expect(backoff.isBackingOff("flaky.example", 1)).toBe(false)
  })
})

describe("retryDelay", () => {
  it("grows with each failure, up to a day", () => {
    expect(retryDelay(1)).toBe(MINUTE)
    expect(retryDelay(2)).toBe(4 * MINUTE)
    expect(retryDelay(20)).toBe(24 * 60 * MINUTE)
  })
})
