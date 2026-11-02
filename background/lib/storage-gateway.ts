const ipfsGateway = new URL("https://ipfs.io/ipfs/")
const arweaveGateway = new URL("https://arweave.net/")

/**
 * An HTTP URL for an `ipfs://` or `ar://` URL, through a public gateway.
 * Other URLs are parsed as they are. Querystrings and hashes are kept.
 *
 * @example
 * url: `ipfs://CID/path/to/resource?parameters#hash`
 * result: `https://ipfs.io/ipfs/CID/path/to/resource?parameters#hash`
 */
// TODO eventually we want proper IPFS and Arweave support
export function storageGatewayURL(url: string): URL {
  const protocol = url.slice(0, url.indexOf("//"))

  switch (protocol) {
    case "ipfs:": {
      // cidv0 is case sensitive
      const contentId = url.split("ipfs://")[1]
      return new URL(contentId, ipfsGateway)
    }
    case "ar:":
      // A URL's protocol can't be switched from ar: to https:, so the path
      // is resolved against the gateway instead.
      return new URL(url.slice("ar://".length), arweaveGateway)
    default:
      return new URL(url)
  }
}
