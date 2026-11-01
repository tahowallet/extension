import { storageGatewayURL } from "../storage-gateway"

describe("storageGatewayURL", () => {
  it("sends ipfs:// URLs through the IPFS gateway", () => {
    expect(storageGatewayURL("ipfs://QmCID/path/1.json?a=b#c").href).toBe(
      "https://ipfs.io/ipfs/QmCID/path/1.json?a=b#c",
    )
  })

  it("sends ar:// URLs through the Arweave gateway", () => {
    expect(storageGatewayURL("ar://TxID/path/1.json?a=b").href).toBe(
      "https://arweave.net/TxID/path/1.json?a=b",
    )
  })

  it("leaves other URLs alone", () => {
    expect(storageGatewayURL("https://example.com/1.png").href).toBe(
      "https://example.com/1.png",
    )
  })
})
