import type { EndpointKind } from "./endpoint"

/**
 * An RPC URL's host, for logs. Paths and queries often carry API keys, as do
 * credentials before the host, so only the host and port are kept.
 */
export function redactedHost(url: string | undefined): string {
  if (url === undefined) {
    return "(no URL)"
  }
  try {
    return new URL(url).host || "(no host)"
  } catch {
    return "(unparseable URL)"
  }
}

const URL_REGEXP = /\b(?:https?|wss?):\/\/[^\s"'<>(),]+/gi

/** Cuts every http(s) and ws(s) URL in `text` down to its host. */
export function redactUrls(text: string): string {
  return text.replace(URL_REGEXP, (url) => redactedHost(url))
}

/**
 * Names an endpoint in logs, such as
 * `chain 8453 standard[1] base-mainnet.g.alchemy.com`.
 */
export function endpointLabel(
  chainID: string,
  kind: EndpointKind,
  index: number,
  url: string | undefined,
): string {
  return `chain ${chainID} ${kind}[${index}] ${redactedHost(url)}`
}
