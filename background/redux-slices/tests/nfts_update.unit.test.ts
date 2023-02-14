import { ETHEREUM } from "../../constants"
import { normalizeEVMAddress } from "../../lib/utils"
import { NFT, TransferredNFT } from "../../nfts"
import {
  deleteTransferred,
  initializeCollections,
  NFTCollectionCached,
  NFTsSliceState,
  updateCollection,
  updateNFTsInCollection,
} from "../nfts_update"

const OWNER_MOCK = "0x1234"
const RECEIVER_MOCK = "0xABCD"
const COLLECTION_MOCK = {
  id: "xyz",
  name: "XYZ",
  owner: OWNER_MOCK,
  network: ETHEREUM,
  hasBadges: false,
  nftCount: 1,
  totalNftCount: 10,
  floorPrice: {
    value: 1000000000000000000n,
    token: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
}
const NFT_MOCK: NFT = {
  id: "xyz-1",
  tokenId: "xyz-1",
  collectionID: COLLECTION_MOCK.id,
  name: "XYZ NFT",
  description: "🐶",
  attributes: [],
  rarity: {},
  contract: "0x0123",
  owner: OWNER_MOCK,
  network: ETHEREUM,
  isBadge: false,
}
const TRANSFER_MOCK: TransferredNFT = {
  id: NFT_MOCK.id,
  collectionID: COLLECTION_MOCK.id,
  chainID: ETHEREUM.chainID,
  from: OWNER_MOCK,
  to: RECEIVER_MOCK,
  isKnownFromAddress: true,
  isKnownToAddress: false,
}

const extractCollection = (
  state: NFTsSliceState,
  collectionID: string = COLLECTION_MOCK.id,
  chainID: string = ETHEREUM.chainID,
  address: string = OWNER_MOCK
): NFTCollectionCached | undefined =>
  state.nfts?.[chainID]?.[address]?.[collectionID]

describe("NFTs redux slice", () => {
  describe("updateCollection util", () => {
    let state: NFTsSliceState

    beforeEach(() => {
      state = {
        isReloading: false,
        nfts: {},
        filters: { collections: [], accounts: [], type: "desc" },
      }
    })

    it("should add a single collection", () => {
      updateCollection(state, COLLECTION_MOCK)

      expect(extractCollection(state)).toMatchObject({
        id: COLLECTION_MOCK.id,
        name: COLLECTION_MOCK.name,
        nftCount: 1,
        totalNftCount: 10,
        nfts: [],
        hasBadges: false,
        chainID: ETHEREUM.chainID,
        owner: OWNER_MOCK,
        thumbnailURL: undefined,
        hasNextPage: false,
        floorPrice: { value: 1, tokenSymbol: "ETH" },
      })
    })

    it("should update collection", () => {
      updateCollection(state, COLLECTION_MOCK)
      updateCollection(state, {
        ...COLLECTION_MOCK,
        name: "new",
        floorPrice: {
          value: 2000000000000000000n,
          token: {
            name: "Ether",
            symbol: "ETH",
            decimals: 18,
          },
        },
      })

      const updated = extractCollection(state)

      expect(updated?.name).toBe("new")
      expect(updated?.floorPrice?.value).toEqual(2)
    })
  })

  describe("deleteTransferred util", () => {
    let state: NFTsSliceState

    beforeEach(() => {
      state = {
        isReloading: false,
        nfts: {},
        filters: { collections: [], accounts: [], type: "desc" },
      }
    })

    describe("when collection has missing data", () => {
      it("should handle transfer even if collection is not saved in state", () => {
        expect(() => deleteTransferred(state, [TRANSFER_MOCK])).not.toThrow()
      })

      it("should handle transfer if collection has many owned NFTs but none cached", () => {
        state = initializeCollections([{ ...COLLECTION_MOCK, nftCount: 10 }])
        deleteTransferred(state, [TRANSFER_MOCK])

        const collection = extractCollection(state)
        expect(collection).toBeDefined()
        expect(collection?.nfts.length).toEqual(0)
        expect(collection?.nftCount).toEqual(9)
      })

      it("should handle transfer if collection has single NFT owned but none cached", () => {
        state = initializeCollections([{ ...COLLECTION_MOCK, nftCount: 1 }])
        deleteTransferred(state, [TRANSFER_MOCK])

        const collection = extractCollection(state)
        expect(collection).not.toBeDefined() // should remove collection as the last NFT was transferred
      })

      it("should handle transfer when there is unknown number of NFTs owned", () => {
        state = initializeCollections([
          { ...COLLECTION_MOCK, nftCount: undefined },
        ])

        expect(() => deleteTransferred(state, [TRANSFER_MOCK])).not.toThrow()
      })

      it("should handle transfer with different owner address format", () => {
        const owner = "0xAD23AB2e2ec036a9ec319187e9659fcf8ddd6d38" // not normalized

        state = initializeCollections([
          { ...COLLECTION_MOCK, nftCount: 3, owner },
        ])
        deleteTransferred(state, [{ ...TRANSFER_MOCK, from: owner }])

        const collection = extractCollection(
          state,
          COLLECTION_MOCK.id,
          ETHEREUM.chainID,
          normalizeEVMAddress(owner)
        )

        expect(collection).toBeDefined()
        expect(collection?.nftCount).toEqual(2)
      })

      it("should handle transfer even if chainID is unknown", () => {
        state = initializeCollections([COLLECTION_MOCK])
        deleteTransferred(state, [{ ...TRANSFER_MOCK, chainID: "12345" }])

        const collection = extractCollection(state)

        expect(collection).toBeDefined()
      })
    })

    describe("when there was a single transfer", () => {
      it("should handle transfer when there are more than 1 NFTs owned and cached", () => {
        const secondID = "xyz-2"

        state = initializeCollections([{ ...COLLECTION_MOCK, nftCount: 2 }])
        updateNFTsInCollection(state, {
          account: {
            address: OWNER_MOCK,
            network: ETHEREUM,
          },
          collectionID: COLLECTION_MOCK.id,
          hasNextPage: false,
          nfts: [NFT_MOCK, { ...NFT_MOCK, id: secondID, tokenId: secondID }],
        })
        deleteTransferred(state, [TRANSFER_MOCK])

        const collection = extractCollection(state)

        expect(collection).toBeDefined()
        expect(collection?.nftCount).toEqual(1)
        expect(collection?.nfts.length).toEqual(1)
        expect(collection?.nfts[0].id).toBe(secondID)
      })

      it("should handle transfer when it is last NFT owned and cached", () => {
        state = initializeCollections([COLLECTION_MOCK])
        updateNFTsInCollection(state, {
          account: {
            address: OWNER_MOCK,
            network: ETHEREUM,
          },
          collectionID: COLLECTION_MOCK.id,
          hasNextPage: false,
          nfts: [NFT_MOCK],
        })
        deleteTransferred(state, [TRANSFER_MOCK])

        const collection = extractCollection(state)

        expect(collection).not.toBeDefined()
      })

      it("should handle transfer when transferred NFT is not cached", () => {
        const secondID = "xyz-2"
        const thirdID = "xyz-3"

        state = initializeCollections([{ ...COLLECTION_MOCK, nftCount: 3 }])
        updateNFTsInCollection(state, {
          account: {
            address: OWNER_MOCK,
            network: ETHEREUM,
          },
          collectionID: COLLECTION_MOCK.id,
          hasNextPage: false,
          nfts: [NFT_MOCK, { ...NFT_MOCK, id: secondID, tokenId: secondID }],
        })
        deleteTransferred(state, [{ ...TRANSFER_MOCK, id: thirdID }])

        const collection = extractCollection(state)

        expect(collection).toBeDefined()
        expect(collection?.nftCount).toEqual(2)
        expect(collection?.nfts.length).toEqual(2)
        expect(collection?.nfts.map((nft) => nft.id)).not.toContain(thirdID)
      })
    })

    describe("when there were multiple transfers", () => {
      it("should handle transfers from multiple collections", () => {
        const secondCollectionID = "abc"
        const firstNftID = "abc-1"
        const secondNftID = "abc-2"

        state = initializeCollections([
          COLLECTION_MOCK,
          {
            ...COLLECTION_MOCK,
            nftCount: 2,
            id: secondCollectionID,
            name: "ABC",
          },
        ])
        updateNFTsInCollection(state, {
          account: {
            address: OWNER_MOCK,
            network: ETHEREUM,
          },
          collectionID: COLLECTION_MOCK.id,
          hasNextPage: false,
          nfts: [NFT_MOCK],
        })
        updateNFTsInCollection(state, {
          account: {
            address: OWNER_MOCK,
            network: ETHEREUM,
          },
          collectionID: secondCollectionID,
          hasNextPage: false,
          nfts: [
            {
              ...NFT_MOCK,
              id: firstNftID,
              tokenId: firstNftID,
              collectionID: secondCollectionID,
              name: "ABC 1 NFT",
            },
            {
              ...NFT_MOCK,
              id: secondNftID,
              tokenId: secondNftID,
              collectionID: secondCollectionID,
              name: "ABC 2 NFT",
            },
          ],
        })

        deleteTransferred(state, [
          TRANSFER_MOCK,
          {
            ...TRANSFER_MOCK,
            id: secondNftID,
            collectionID: secondCollectionID,
          },
        ])

        const firstCollection = extractCollection(state)
        const secondCollection = extractCollection(state, secondCollectionID)
        const secondCollectionNFTs = secondCollection?.nfts.map((nft) => nft.id)

        expect(firstCollection).not.toBeDefined()
        expect(secondCollection).toBeDefined()
        expect(secondCollection?.nftCount).toEqual(1)
        expect(secondCollectionNFTs).not.toContain(secondNftID)
        expect(secondCollectionNFTs).toContain(firstNftID)
      })

      it("should handle transfers from the same collection", () => {
        const secondID = "xyz-2"
        const thirdID = "xyz-3"

        state = initializeCollections([{ ...COLLECTION_MOCK, nftCount: 3 }])
        updateNFTsInCollection(state, {
          account: {
            address: OWNER_MOCK,
            network: ETHEREUM,
          },
          collectionID: COLLECTION_MOCK.id,
          hasNextPage: false,
          nfts: [
            NFT_MOCK,
            { ...NFT_MOCK, id: secondID, tokenId: secondID, name: "XYZ 2 NFT" },
            { ...NFT_MOCK, id: thirdID, tokenId: thirdID, name: "XYZ 3 NFT" },
          ],
        })

        deleteTransferred(state, [
          TRANSFER_MOCK,
          { ...TRANSFER_MOCK, id: secondID },
        ])

        const collection = extractCollection(state)
        const collectionNFTs = collection?.nfts.map((nft) => nft.id)

        expect(collection).toBeDefined()
        expect(collection?.nftCount).toEqual(1)
        expect(collectionNFTs).toContain(thirdID)
      })

      it("should handle transfers of all NFTs owned from the same collection", () => {
        const secondID = "xyz-2"

        state = initializeCollections([{ ...COLLECTION_MOCK, nftCount: 2 }])
        updateNFTsInCollection(state, {
          account: {
            address: OWNER_MOCK,
            network: ETHEREUM,
          },
          collectionID: COLLECTION_MOCK.id,
          hasNextPage: false,
          nfts: [
            NFT_MOCK,
            { ...NFT_MOCK, id: secondID, tokenId: secondID, name: "XYZ 2 NFT" },
          ],
        })

        deleteTransferred(state, [
          TRANSFER_MOCK,
          { ...TRANSFER_MOCK, id: secondID },
        ])

        const collection = extractCollection(state)

        expect(collection).not.toBeDefined()
      })
    })
  })
})
