const ipfsGateway = new URL("https://ipfs.io/ipfs/")
const arweaveGateway = new URL("https://arweave.net/")

/**
 * Given a url and a base URL, adjust the url to match the protocol and
 * hostname of the base URL, and append the hostname and remaining path of the
 * original url as path components in the base URL. Preserves querystrings and
 * hash data if present.
 *
 * @example
 * url: `ipfs://CID/path/to/resource`
 * baseURL: `https://ipfs.io/ipfs/`
 * result: `https://ipfs.io/ipfs/CID/path/to/resource`
 *
 * @example
 * url: `ipfs://CID/path/to/resource?parameters#hash`
 * baseURL: `https://ipfs.io/ipfs/`
 * result: `https://ipfs.io/ipfs/CID/path/to/resource?parameters#hash`
 */
export function changeURLProtocolAndBase(url: URL, baseURL: URL): URL {
  const newURL = new URL(url)
  newURL.protocol = baseURL.protocol
  newURL.hostname = baseURL.hostname
  newURL.pathname = `${baseURL.pathname}/${url.hostname}/${url.pathname}`

  return newURL
}

// TODO eventually we want proper IPFS and Arweave support
export function storageGatewayURL(url: URL): URL {
  switch (url.protocol) {
    case "ipfs:":
      return changeURLProtocolAndBase(url, ipfsGateway)
    case "ar:":
      return changeURLProtocolAndBase(url, arweaveGateway)
    default:
      return url
  }
}
