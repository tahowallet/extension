import { ethers } from "ethers"
import { IDBFactory } from "fake-indexeddb"

import { ETHEREUM, POLYGON } from "../../../constants"
import { getOrCreateDB, NFTsDatabase } from "../../../services/nfts/db"
import { ERC721_INTERFACE, parseERC721TransferLog } from "../../erc721"
import { normalizeEVMAddress } from "../../utils"
import {
  ACCOUNT,
  ALL_LOGS,
  COLLECTION,
  erc721TransferLog,
  OTHER,
  OTHER_COLLECTION,
  TRANSFER_IN,
} from "../../tests/fixtures/erc721/transfer-logs"
import { CallProvider, forgetMulticallDeployments } from "../batch-calls"
import NFTIndexer, { NFTS_PER_PAGE } from ".."
import { erc721CollectionID } from "../ledger"

const NOT_AN_NFT = "0x6666666666666666666666666666666666666666"
const account = { address: ACCOUNT, network: ETHEREUM }

type Chain = {
  /** Owner by `contract:tokenId`; missing tokens revert. */
  owners: Map<string, string>
  tokenURIs: Map<string, string>
  contracts: Map<string, { isERC721: boolean; name?: string }>
}

const key = (contract: string, tokenId: string) =>
  `${normalizeEVMAddress(contract)}:${tokenId}`

/** A provider answering ERC-721 calls from a table, without Multicall3. */
function chainProvider(chain: Chain) {
  const revert = () =>
    Object.assign(new Error("execution reverted"), {
      code: ethers.errors.CALL_EXCEPTION,
    })
  const call = jest.fn(async ({ to, data }: { to: string; data: string }) => {
    const { name, args } = ERC721_INTERFACE.parseTransaction({ data })
    const contract = chain.contracts.get(normalizeEVMAddress(to))
    const tokenKey = args.length > 0 ? key(to, args[0].toString()) : ""
    const answer = (value: unknown) =>
      ERC721_INTERFACE.encodeFunctionResult(name, [value])

    switch (name) {
      case "supportsInterface":
        return answer(contract?.isERC721 ?? false)
      case "name":
        if (contract?.name === undefined) throw revert()
        return answer(contract.name)
      case "symbol":
        throw revert()
      case "ownerOf": {
        const owner = chain.owners.get(tokenKey)
        if (owner === undefined) throw revert()
        return answer(owner)
      }
      case "tokenURI": {
        const uri = chain.tokenURIs.get(tokenKey)
        if (uri === undefined) throw revert()
        return answer(uri)
      }
      default:
        throw revert()
    }
  })
  const provider: CallProvider = {
    chainID: ETHEREUM.chainID,
    call,
    getCode: async () => "0x",
  }
  return { provider, call }
}

const dataURI = (json: unknown) =>
  `data:application/json;base64,${Buffer.from(JSON.stringify(json)).toString("base64")}`

describe("NFTIndexer", () => {
  let db: NFTsDatabase
  let chain: Chain
  let fetchStub: AnyMock
  let indexer: NFTIndexer
  let call: ReturnType<typeof chainProvider>["call"]

  const record = (logs = ALL_LOGS) =>
    indexer.recordTransfers(
      account,
      logs.flatMap((log) => parseERC721TransferLog(log, ETHEREUM) ?? []),
    )

  beforeEach(async () => {
    indexedDB = new IDBFactory()
    forgetMulticallDeployments()
    db = await getOrCreateDB()
    chain = {
      owners: new Map([
        [key(COLLECTION, "1"), ACCOUNT],
        [key(COLLECTION, "3"), OTHER],
        [key(COLLECTION, "4"), ACCOUNT],
        [key(COLLECTION, "5"), ACCOUNT],
        [key(OTHER_COLLECTION, "1"), ACCOUNT],
      ]),
      tokenURIs: new Map(),
      contracts: new Map([
        [normalizeEVMAddress(COLLECTION), { isERC721: true, name: "Foxes" }],
        [normalizeEVMAddress(OTHER_COLLECTION), { isERC721: true }],
      ]),
    }
    const stub = chainProvider(chain)
    call = stub.call
    fetchStub = jest.fn(async () => new Response("", { status: 503 }))
    indexer = new NFTIndexer({
      db,
      providerFor: () => stub.provider,
      fetch: fetchStub as unknown as typeof fetch,
    })
  })

  afterEach(() => db.close())

  it("counts only new ledger entries", async () => {
    expect(await record()).toBe(ALL_LOGS.length)
    expect(await record()).toBe(0)
  })

  it("shows the tokens ownerOf confirms, by collection", async () => {
    await record()
    await indexer.getNFTsTransfers([account])

    const collections = await indexer.getNFTCollections(ACCOUNT, ["1"])

    expect(
      collections
        .map(({ id, name, nftCount, floorPrice, totalNftCount }) => ({
          id,
          name,
          nftCount,
          floorPrice,
          totalNftCount,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    ).toEqual([
      {
        id: erc721CollectionID("1", COLLECTION),
        name: "Foxes",
        nftCount: 3,
        floorPrice: undefined,
        totalNftCount: undefined,
      },
      {
        id: erc721CollectionID("1", OTHER_COLLECTION),
        // No name or symbol, so the address stands in.
        name: "0x5555…55555",
        nftCount: 1,
        floorPrice: undefined,
        totalNftCount: undefined,
      },
    ])
  })

  it("shows nothing before ownership has been checked", async () => {
    await record()

    expect(await indexer.getNFTCollections(ACCOUNT, ["1"])).toEqual([])
  })

  it("trusts ownerOf over a stale ledger", async () => {
    // The ledger missed token 1 leaving and token 5 being burnt.
    chain.owners.set(key(COLLECTION, "1"), OTHER)
    chain.owners.delete(key(COLLECTION, "5"))
    await record()
    await indexer.getNFTsTransfers([account])

    const { nfts } = await indexer.getNFTs(
      ACCOUNT,
      erc721CollectionID("1", COLLECTION),
      ["1"],
    )

    expect(nfts.map(({ tokenId }) => tokenId)).toEqual(["4"])
  })

  it("reports tokens gained and lost since the last check", async () => {
    await record()
    const first = await indexer.getNFTsTransfers([account])
    expect(
      first.filter(({ isKnownToAddress }) => isKnownToAddress),
    ).toHaveLength(4)

    chain.owners.set(key(COLLECTION, "4"), OTHER)
    const second = await indexer.getNFTsTransfers([account])

    expect(second).toEqual([
      {
        id: `1:${normalizeEVMAddress(COLLECTION)}:4`,
        chainID: "1",
        from: ACCOUNT,
        to: null,
        isKnownFromAddress: true,
        isKnownToAddress: false,
        collectionID: erc721CollectionID("1", COLLECTION),
      },
    ])
    expect(await indexer.getNFTsTransfers([account])).toEqual([])
  })

  it("keeps what it knew when ownerOf can't be asked", async () => {
    await record()
    await indexer.getNFTsTransfers([account])
    call.mockImplementation(async () => {
      throw new Error("NETWORK_ERROR")
    })

    expect(await indexer.getNFTsTransfers([account])).toEqual([])
    expect(await indexer.getNFTCollections(ACCOUNT, ["1"])).toHaveLength(2)
  })

  it("leaves out contracts that don't support ERC-721", async () => {
    chain.owners.set(key(NOT_AN_NFT, "1"), ACCOUNT)
    await record([
      erc721TransferLog({
        from: OTHER,
        to: ACCOUNT,
        tokenId: 1n,
        contractAddress: NOT_AN_NFT,
      }),
    ])

    expect(await indexer.getNFTsTransfers([account])).toEqual([])
    expect(await indexer.getNFTCollections(ACCOUNT, ["1"])).toEqual([])
  })

  it("only serves the chains asked for", async () => {
    await record()
    await indexer.getNFTsTransfers([account])

    expect(await indexer.getNFTCollections(ACCOUNT, [POLYGON.chainID])).toEqual(
      [],
    )
    expect(
      await indexer.getNFTs(ACCOUNT, erc721CollectionID("1", COLLECTION), [
        POLYGON.chainID,
      ]),
    ).toEqual({ nfts: [], nextPage: null })
    expect(await indexer.getNFTs(ACCOUNT, "POAP", ["1"])).toEqual({
      nfts: [],
      nextPage: null,
    })
  })

  describe("metadata", () => {
    beforeEach(async () => {
      chain.tokenURIs.set(
        key(COLLECTION, "1"),
        dataURI({
          name: "Red fox",
          description: "Quick.",
          image: "ipfs://QmFox/1.png",
          attributes: [{ trait_type: "Fur", value: "Red" }],
        }),
      )
      chain.tokenURIs.set(key(COLLECTION, "4"), "https://broken.example/4")
      // Token 5 has no token URI at all.
      await record([...ALL_LOGS])
      await indexer.getNFTsTransfers([account])
    })

    const page = () =>
      indexer.getNFTs(ACCOUNT, erc721CollectionID("1", COLLECTION), ["1"])

    it("maps token metadata into NFTs", async () => {
      const { nfts, nextPage } = await page()

      expect(nextPage).toBeNull()
      expect(nfts[0]).toEqual({
        id: `1:${normalizeEVMAddress(COLLECTION)}:1`,
        tokenId: "1",
        collectionID: erc721CollectionID("1", COLLECTION),
        name: "Red fox",
        description: "Quick.",
        thumbnailURL: "https://ipfs.io/ipfs/QmFox/1.png",
        previewURL: "https://ipfs.io/ipfs/QmFox/1.png",
        attributes: [{ trait: "Fur", value: "Red" }],
        rarity: {},
        contract: normalizeEVMAddress(COLLECTION),
        owner: ACCOUNT,
        network: ETHEREUM,
        isBadge: false,
      })
    })

    it("shows a placeholder for tokens whose metadata fails", async () => {
      const { nfts } = await page()

      expect(
        nfts.slice(1).map(({ name, thumbnailURL }) => [name, thumbnailURL]),
      ).toEqual([
        ["Foxes #4", undefined],
        ["Foxes #5", undefined],
      ])
      expect(fetchStub).toHaveBeenCalledTimes(1)
    })

    it("uses the first token's image for the collection", async () => {
      const collections = await indexer.getNFTCollections(ACCOUNT, ["1"])

      expect(
        collections.find(({ name }) => name === "Foxes")?.thumbnailURL,
      ).toBe("https://ipfs.io/ipfs/QmFox/1.png")
    })

    it("caches metadata and waits before retrying failures", async () => {
      await page()
      call.mockClear()
      fetchStub.mockClear()

      await page()

      expect(call).not.toHaveBeenCalled()
      expect(fetchStub).not.toHaveBeenCalled()
    })

    it("retries a failed token once its wait is over", async () => {
      let now = 1_000_000
      indexer = new NFTIndexer({
        db,
        providerFor: () => chainProvider(chain).provider,
        fetch: fetchStub as unknown as typeof fetch,
        now: () => now,
      })
      await page()
      fetchStub.mockClear()

      now += 2 * 60 * 1000
      chain.tokenURIs.set(key(COLLECTION, "4"), dataURI({ name: "Fixed" }))
      const { nfts } = await page()

      expect(nfts[1].name).toBe("Fixed")
    })
  })

  it("pages through large collections from the database", async () => {
    const logs = Array.from({ length: NFTS_PER_PAGE + 1 }, (_, index) => {
      chain.owners.set(key(COLLECTION, String(100 + index)), ACCOUNT)
      return erc721TransferLog({
        from: OTHER,
        to: ACCOUNT,
        tokenId: BigInt(100 + index),
        blockNumber: 100 + index,
      })
    })
    await record(logs)
    await indexer.getNFTsTransfers([account])
    const collectionID = erc721CollectionID("1", COLLECTION)

    const first = await indexer.getNFTs(ACCOUNT, collectionID, ["1"])
    const second = await indexer.getNFTs(ACCOUNT, collectionID, ["1"], "50")

    expect(first.nfts).toHaveLength(NFTS_PER_PAGE)
    expect(first.nextPage).toBe(String(NFTS_PER_PAGE))
    expect(second.nfts.map(({ tokenId }) => tokenId)).toEqual(["150"])
    expect(second.nextPage).toBeNull()
  })

  it("ignores repeats of a transfer it has already recorded", async () => {
    expect(await record([TRANSFER_IN, TRANSFER_IN])).toBe(1)
  })
})
