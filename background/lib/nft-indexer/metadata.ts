import { DAY, MINUTE, SECOND } from "../../constants"
import { storageGatewayURL } from "../storage-gateway"

/** How long a metadata fetch over HTTP may take. */
export const METADATA_FETCH_TIMEOUT_MS = 10 * SECOND

/** The largest metadata response read over HTTP. */
export const MAX_METADATA_BYTES = 1024 * 1024

/** Metadata the NFT views show. */
export type TokenMetadata = {
  name?: string
  description?: string
  image?: string
  attributes: { trait: string; value: string }[]
}

/** A failed metadata fetch, naming the host when one was asked. */
export class MetadataFetchError extends Error {
  constructor(
    message: string,
    readonly host?: string,
  ) {
    super(message)
    this.name = "MetadataFetchError"
  }
}

type ResolvedURI =
  | { kind: "data"; body: string; isBase64: boolean }
  | { kind: "http"; url: URL }

/**
 * Where a token or media URI's content lives: inline in a `data:` URI, or at
 * an HTTP URL, with `ipfs://` and `ar://` sent through the storage gateways.
 */
function resolveURI(uri: string): ResolvedURI {
  const trimmed = uri.trim()

  if (trimmed.startsWith("data:")) {
    const comma = trimmed.indexOf(",")
    if (comma === -1) {
      throw new MetadataFetchError("Malformed data URI")
    }
    return {
      kind: "data",
      body: trimmed.slice(comma + 1),
      isBase64: trimmed.slice(5, comma).split(";").includes("base64"),
    }
  }

  if (trimmed.startsWith("ipfs://")) {
    // Some contracts repeat the namespace, as in ipfs://ipfs/<CID>.
    const path = trimmed.slice("ipfs://".length).replace(/^ipfs\//, "")
    return { kind: "http", url: storageGatewayURL(`ipfs://${path}`) }
  }

  if (trimmed.startsWith("ar://")) {
    return { kind: "http", url: storageGatewayURL(trimmed) }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "http", url: new URL(trimmed) }
  }

  throw new MetadataFetchError(`Unsupported token URI scheme: ${uri}`)
}

function decodeBase64UTF8(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function parseDataBody(body: string, isBase64: boolean): unknown {
  if (isBase64) {
    return JSON.parse(decodeBase64UTF8(decodeURIComponent(body)))
  }
  try {
    return JSON.parse(body)
  } catch (_err) {
    return JSON.parse(decodeURIComponent(body))
  }
}

/** Reads at most `maxBytes` of a response body as text. */
async function readCapped(
  response: Response,
  maxBytes: number,
  host: string,
): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? NaN)
  if (declared > maxBytes) {
    throw new MetadataFetchError(`Metadata of ${declared} bytes is too big`)
  }
  if (response.body === null) {
    return ""
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw new MetadataFetchError(
        `Metadata over ${maxBytes} bytes is too big`,
        host,
      )
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(size)
  chunks.reduce((offset, chunk) => {
    bytes.set(chunk, offset)
    return offset + chunk.byteLength
  }, 0)
  return new TextDecoder().decode(bytes)
}

/** The host a token URI's metadata would be fetched from, if any. */
export function metadataHost(uri: string): string | undefined {
  try {
    const resolved = resolveURI(uri)
    return resolved.kind === "http" ? resolved.url.host : undefined
  } catch (_err) {
    return undefined
  }
}

/**
 * Fetches and parses the JSON a token URI points to: inline for `data:`
 * URIs, through the storage gateways for `ipfs://` and `ar://`, and over
 * HTTP with a timeout and a size cap otherwise.
 */
export async function fetchTokenMetadataJSON(
  uri: string,
  {
    fetch: fetchFn = fetch,
    timeoutMs = METADATA_FETCH_TIMEOUT_MS,
    maxBytes = MAX_METADATA_BYTES,
  }: {
    fetch?: typeof fetch
    timeoutMs?: number
    maxBytes?: number
  } = {},
): Promise<unknown> {
  const resolved = resolveURI(uri)

  if (resolved.kind === "data") {
    try {
      return parseDataBody(resolved.body, resolved.isBase64)
    } catch (error) {
      throw new MetadataFetchError(`Unreadable data URI: ${String(error)}`)
    }
  }

  const { host } = resolved.url
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchFn(resolved.url.toString(), {
      signal: controller.signal,
      credentials: "omit",
    })
    if (!response.ok) {
      throw new MetadataFetchError(`HTTP ${response.status}`, host)
    }
    return JSON.parse(await readCapped(response, maxBytes, host))
  } catch (error) {
    if (error instanceof MetadataFetchError) {
      throw error
    }
    throw new MetadataFetchError(String(error), host)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * A media URL a browser can load: `ipfs://` and `ar://` go through the
 * storage gateways, and HTTP and `data:` URLs stay as they are.
 */
export function normalizeMediaURL(url: unknown): string | undefined {
  if (typeof url !== "string" || url.trim() === "") {
    return undefined
  }
  const trimmed = url.trim()
  if (/^(https?|data):/i.test(trimmed)) {
    return trimmed
  }
  try {
    const resolved = resolveURI(trimmed)
    return resolved.kind === "http" ? resolved.url.toString() : undefined
  } catch (_err) {
    return undefined
  }
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number") {
    return String(value)
  }
  return undefined
}

/** Maps ERC-721 metadata JSON to what the NFT views show. */
export function tokenMetadataFromJSON(json: unknown): TokenMetadata {
  if (typeof json !== "object" || json === null) {
    return { attributes: [] }
  }
  const record = json as Record<string, unknown>

  const svg = optionalString(record.image_data)
  const image =
    normalizeMediaURL(record.image) ??
    normalizeMediaURL(record.image_url) ??
    (svg?.trim().startsWith("<svg")
      ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
      : undefined)

  const attributes = Array.isArray(record.attributes)
    ? record.attributes.flatMap((attribute: unknown) => {
        if (typeof attribute !== "object" || attribute === null) {
          return []
        }
        const { trait_type: trait, value } = attribute as Record<
          string,
          unknown
        >
        const traitString = optionalString(trait)
        const valueString = optionalString(value)
        return traitString && valueString !== undefined
          ? [{ trait: traitString, value: valueString }]
          : []
      })
    : []

  return {
    name: optionalString(record.name) ?? optionalString(record.title),
    description: optionalString(record.description),
    image,
    attributes,
  }
}

/** How long to wait before trying a fetch that has failed `failures` times. */
export function retryDelay(failures: number): number {
  return Math.min(MINUTE * 4 ** Math.max(0, failures - 1), DAY)
}

/** Hosts to leave alone for a while after repeated failures. */
export class HostBackoff {
  private readonly hosts = new Map<
    string,
    { failures: number; until: number }
  >()

  /** Failures in a row before a host is left alone. */
  static readonly FAILURES_BEFORE_BACKOFF = 2

  isBackingOff(host: string, now: number): boolean {
    return (this.hosts.get(host)?.until ?? 0) > now
  }

  recordFailure(host: string, now: number): void {
    const failures = (this.hosts.get(host)?.failures ?? 0) + 1
    const until =
      failures >= HostBackoff.FAILURES_BEFORE_BACKOFF
        ? now +
          retryDelay(failures - HostBackoff.FAILURES_BEFORE_BACKOFF + 1) * 5
        : 0
    this.hosts.set(host, { failures, until })
  }

  recordSuccess(host: string): void {
    this.hosts.delete(host)
  }
}
