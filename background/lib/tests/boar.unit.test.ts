import { ETHEREUM } from "../../constants"
import { storage as flagStorage } from "../../features"
import type SerialFallbackProvider from "../../services/chain/serial-fallback-provider"
import {
  getAssetTransfers,
  getERC721TransferPage,
  getFirstIncomingTransferBlock,
} from "../boar"

const ACCOUNT = "0x1111111111111111111111111111111111111111"
const OTHER = "0x2222222222222222222222222222222222222222"
const COLLECTION = "0x4444444444444444444444444444444444444444"

const erc20Transfer = {
  asset: "USDC",
  hash: `0x${"20".repeat(32)}`,
  blockNum: "0x10",
  category: "erc20",
  from: OTHER,
  to: ACCOUNT,
  erc721TokenId: null,
  rawContract: { address: OTHER, decimal: "0x6", value: "0x64" },
}

const erc721Transfer = {
  asset: "PUNK",
  hash: `0x${"72".repeat(32)}`,
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
    expect(assetTransfers.map(({ txHash }) => txHash)).toEqual([
      `0x${"20".repeat(32)}`,
    ])
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
    expect(assetTransfers.map(({ txHash }) => txHash)).toEqual([
      `0x${"20".repeat(32)}`,
    ])
    expect(nftTransfers).toEqual([
      {
        network: ETHEREUM,
        contractAddress: COLLECTION,
        tokenId: "10",
        from: OTHER,
        to: ACCOUNT,
        txHash: `0x${"72".repeat(32)}`,
        blockNumber: 32,
        logIndex: 5,
      },
    ])
  })
})

describe("getERC721TransferPage", () => {
  it("asks for a page of ERC-721 transfers and returns the next page's key", async () => {
    const send = jest.fn(async () => ({
      transfers: [erc721Transfer],
      pageKey: "next",
    }))
    const provider = { send } as unknown as SerialFallbackProvider

    const page = await getERC721TransferPage(
      provider,
      { address: ACCOUNT, network: ETHEREUM },
      "outgoing",
      "this",
    )

    expect(send).toHaveBeenCalledWith("alchemy_getAssetTransfers", [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        maxCount: "0x3e8",
        order: "desc",
        category: ["erc721"],
        fromAddress: ACCOUNT,
        pageKey: "this",
      },
    ])
    expect(page.pageKey).toBe("next")
    expect(page.nftTransfers.map(({ tokenId }) => tokenId)).toEqual(["10"])
  })

  it("throws rather than report the last page when the answer doesn't validate", async () => {
    const provider = {
      send: async () => ({ unexpected: true }),
    } as unknown as SerialFallbackProvider

    await expect(
      getERC721TransferPage(
        provider,
        { address: ACCOUNT, network: ETHEREUM },
        "incoming",
      ),
    ).rejects.toThrow("didn't validate")
  })
})

describe("getFirstIncomingTransferBlock", () => {
  it("returns the block of the oldest incoming transfer", async () => {
    const { send, provider } = providerAnswering([erc20Transfer])

    await expect(
      getFirstIncomingTransferBlock(provider, {
        address: ACCOUNT,
        network: ETHEREUM,
      }),
    ).resolves.toBe(16)
    const [, [params]] = send.mock.calls[0] as unknown as [
      string,
      [{ order: string; maxCount: string; category: string[] }],
    ]
    expect(params.order).toBe("asc")
    expect(params.maxCount).toBe("0x1")
    expect(params.category).toContain("erc721")
  })

  it("returns null for an account nothing was sent to", async () => {
    const { provider } = providerAnswering([])

    await expect(
      getFirstIncomingTransferBlock(provider, {
        address: ACCOUNT,
        network: ETHEREUM,
      }),
    ).resolves.toBeNull()
  })

  it("throws rather than guess when the answer doesn't validate", async () => {
    const provider = {
      send: async () => ({ unexpected: true }),
    } as unknown as SerialFallbackProvider

    await expect(
      getFirstIncomingTransferBlock(provider, {
        address: ACCOUNT,
        network: ETHEREUM,
      }),
    ).rejects.toThrow("didn't validate")
  })
})
