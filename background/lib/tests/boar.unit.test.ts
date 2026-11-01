import { ETHEREUM } from "../../constants"
import { storage as flagStorage } from "../../features"
import type SerialFallbackProvider from "../../services/chain/serial-fallback-provider"
import { getAssetTransfers } from "../boar"

const ACCOUNT = "0x1111111111111111111111111111111111111111"
const OTHER = "0x2222222222222222222222222222222222222222"
const COLLECTION = "0x4444444444444444444444444444444444444444"

const erc20Transfer = {
  asset: "USDC",
  hash: "0xerc20",
  blockNum: "0x10",
  category: "erc20",
  from: OTHER,
  to: ACCOUNT,
  erc721TokenId: null,
  rawContract: { address: OTHER, decimal: "0x6", value: "0x64" },
}

const erc721Transfer = {
  asset: "PUNK",
  hash: "0xerc721",
  blockNum: "0x20",
  uniqueId: "0xerc721:log:5",
  category: "erc721",
  from: OTHER,
  to: ACCOUNT,
  erc721TokenId: "0x0a",
  tokenId: "0x0a",
  rawContract: { address: COLLECTION, decimal: null, value: null },
}

const providerAnswering = (transfers: unknown[]) => {
  const send = jest.fn(async () => ({ transfers }))
  return { send, provider: { send } as unknown as SerialFallbackProvider }
}

describe("getAssetTransfers", () => {
  afterEach(() => flagStorage.delete("SUPPORT_NFT_INDEXER"))

  it("asks for no ERC-721 transfers with the NFT indexer off", async () => {
    const { send, provider } = providerAnswering([erc20Transfer])

    const { assetTransfers, nftTransfers } = await getAssetTransfers(
      provider,
      { address: ACCOUNT, network: ETHEREUM },
      "incoming",
      0,
    )

    const [, [{ category }]] = send.mock.calls[0] as unknown as [
      string,
      [{ category: string[] }],
    ]
    expect(category).not.toContain("erc721")
    expect(assetTransfers.map(({ txHash }) => txHash)).toEqual(["0xerc20"])
    expect(nftTransfers).toEqual([])
  })

  it("returns ERC-721 transfers apart from the same call with it on", async () => {
    flagStorage.set("SUPPORT_NFT_INDEXER", "true")
    const { send, provider } = providerAnswering([
      erc20Transfer,
      erc721Transfer,
    ])

    const { assetTransfers, nftTransfers } = await getAssetTransfers(
      provider,
      { address: ACCOUNT, network: ETHEREUM },
      "incoming",
      0,
    )

    expect(send).toHaveBeenCalledTimes(1)
    const [, [{ category }]] = send.mock.calls[0] as unknown as [
      string,
      [{ category: string[] }],
    ]
    expect(category).toContain("erc721")
    expect(assetTransfers.map(({ txHash }) => txHash)).toEqual(["0xerc20"])
    expect(nftTransfers).toEqual([
      {
        network: ETHEREUM,
        contractAddress: COLLECTION,
        tokenId: "10",
        from: OTHER,
        to: ACCOUNT,
        txHash: "0xerc721",
        blockNumber: 32,
        logIndex: 5,
      },
    ])
  })
})
