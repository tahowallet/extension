const ipfsGateway = new URL("https://ipfs.io/ipfs")
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
  newURL.pathname = `${baseURL.pathname}/${url.hostname}`

  if (url.pathname !== "" && url.pathname !== "/") {
    newURL.pathname += url.pathname
  }

  return newURL
}

// TODO eventually we want proper IPFS and Arweave support
export function storageGatewayURL(url: URL): URL {
  switch (url.protocol) {
    case "ipfs:": {
      // Set to HTTPs so Chrome URL parser can get content identifier
      // as the hostname for ipfs links
      const fixedURL = new URL(url)
      fixedURL.protocol = "https"
      return changeURLProtocolAndBase(fixedURL, ipfsGateway)
    }
    case "ar:":
      return changeURLProtocolAndBase(url, arweaveGateway)
    default:
      return url
  }
}
