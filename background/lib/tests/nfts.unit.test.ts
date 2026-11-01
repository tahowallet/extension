import * as sinon from "sinon"
import { ETHEREUM, POLYGON, ROOTSTOCK } from "../../constants"
import { storage as flagStorage } from "../../features"
import { POAP_COLLECTION_ID } from "../poap"
import { getNFTCollections, getNFTs, getNFTsTransfers } from "../nfts"
import type NFTIndexer from "../nft-indexer"

const ADDRESS = "0x1111111111111111111111111111111111111111"
const COLLECTION_ID = "erc721:137:0x4444444444444444444444444444444444444444"

const stubIndexer = () => ({
  getNFTCollections: sinon.stub().resolves([]),
  getNFTs: sinon.stub().resolves({ nfts: [], nextPage: "50" }),
  getNFTsTransfers: sinon.stub().resolves([]),
})

const accounts = [
  { address: ADDRESS, network: POLYGON },
  { address: ADDRESS, network: ROOTSTOCK },
]

describe("NFT sources", () => {
  // No POAP collection is asked for, so the POAP API isn't called.
  afterEach(() => flagStorage.delete("SUPPORT_NFT_INDEXER"))

  describe("with the NFT indexer off", () => {
    it("asks the indexer nothing", async () => {
      const indexer = stubIndexer()
      const asIndexer = indexer as unknown as NFTIndexer

      await Promise.all(getNFTCollections(accounts, asIndexer))
      await Promise.all(getNFTs(accounts, [COLLECTION_ID], asIndexer))
      await getNFTsTransfers(accounts, asIndexer)

      expect(indexer.getNFTCollections.called).toBe(false)
      expect(indexer.getNFTs.called).toBe(false)
      expect(indexer.getNFTsTransfers.called).toBe(false)
    })
  })

  describe("with the NFT indexer on", () => {
    beforeEach(() => flagStorage.set("SUPPORT_NFT_INDEXER", "true"))

    it("asks it about the networks it covers, not Rootstock", async () => {
      const indexer = stubIndexer()
      const asIndexer = indexer as unknown as NFTIndexer

      await Promise.all(getNFTCollections(accounts, asIndexer))
      await getNFTsTransfers(accounts, asIndexer)

      expect(indexer.getNFTCollections.firstCall.args).toEqual([
        ADDRESS,
        [POLYGON.chainID],
      ])
      expect(indexer.getNFTsTransfers.firstCall.args).toEqual([
        [{ address: ADDRESS, network: POLYGON }],
      ])
    })

    it("passes on the indexer's next page", async () => {
      const indexer = stubIndexer()

      const [result] = await Promise.all(
        getNFTs(accounts, [COLLECTION_ID], indexer as unknown as NFTIndexer),
      )

      expect(result.nextPages).toEqual({ [COLLECTION_ID]: { [ADDRESS]: "50" } })
    })

    it("keeps POAPs on Ethereum", async () => {
      const indexer = stubIndexer()

      const [collections] = await Promise.all(
        getNFTCollections(
          [{ address: ADDRESS, network: ETHEREUM }],
          indexer as unknown as NFTIndexer,
        ),
      )

      expect(collections.map(({ id }) => id)).toContain(POAP_COLLECTION_ID)
    })
  })
})
