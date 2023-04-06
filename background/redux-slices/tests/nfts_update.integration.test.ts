import { ETHEREUM } from "../../constants"
import { normalizeEVMAddress } from "../../lib/utils"
import {
  OWNER_MOCK,
  COLLECTION_MOCK,
  NFT_MOCK,
  TRANSFER_MOCK,
  extractCollection,
} from "./nfts_update.utils"
import reducer, {
  deleteTransferredNFTs,
  NFTsSliceState,
  updateNFTsCollections,
  updateNFTs,
} from "../nfts_update"

describe("NFTs redux slice", () => {
  describe("Delete transferred NFTs from state", () => {
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
        const stateAfterTransfers = reducer(
          state,
          deleteTransferredNFTs([TRANSFER_MOCK])
        )
        expect(stateAfterTransfers.nfts).toMatchObject({})
      })

      it("should handle transfer if collection has many owned NFTs but none cached", () => {
        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: 10 }])
        )
        const stateAfterTransfers = reducer(
          stateWithCollections,
          deleteTransferredNFTs([TRANSFER_MOCK])
        )

        const collection = extractCollection(stateAfterTransfers)
        expect(collection).toBeDefined()
        expect(collection?.nfts.length).toEqual(0)
        expect(collection?.nftCount).toEqual(9)
      })

      it("should handle transfer if collection has single NFT owned but none cached", () => {
        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: 1 }])
        )
        const stateAfterTransfers = reducer(
          stateWithCollections,
          deleteTransferredNFTs([TRANSFER_MOCK])
        )

        const collection = extractCollection(stateAfterTransfers)
        expect(collection).not.toBeDefined() // should remove collection as the last NFT was transferred
      })

      it("should handle transfer when there is unknown number of NFTs owned", () => {
        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: undefined }])
        )

        expect(() =>
          reducer(stateWithCollections, deleteTransferredNFTs([TRANSFER_MOCK]))
        ).not.toThrow()
      })

      it("should handle transfer with different owner address format", () => {
        const owner = "0xAD23AB2e2ec036a9ec319187e9659fcf8ddd6d38" // not normalized

        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: 3, owner }])
        )
        const stateAfterTransfers = reducer(
          stateWithCollections,
          deleteTransferredNFTs([{ ...TRANSFER_MOCK, from: owner }])
        )

        const collection = extractCollection(
          stateAfterTransfers,
          COLLECTION_MOCK.id,
          ETHEREUM.chainID,
          normalizeEVMAddress(owner)
        )

        expect(collection).toBeDefined()
        expect(collection?.nftCount).toEqual(2)
      })

      it("should handle transfer even if chainID is unknown", () => {
        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([COLLECTION_MOCK])
        )
        const stateAfterTransfers = reducer(
          stateWithCollections,
          deleteTransferredNFTs([{ ...TRANSFER_MOCK, chainID: "12345" }])
        )

        const collection = extractCollection(stateAfterTransfers)
        expect(collection).toBeDefined()
      })
    })

    describe("when there was a single transfer", () => {
      it("should handle transfer when there are more than 1 NFTs owned and cached", () => {
        const secondID = "xyz-2"

        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: 2 }])
        )
        const stateWithNFTs = reducer(
          stateWithCollections,
          updateNFTs({
            account: {
              address: OWNER_MOCK,
              network: ETHEREUM,
            },
            collectionID: COLLECTION_MOCK.id,
            hasNextPage: false,
            nfts: [NFT_MOCK, { ...NFT_MOCK, id: secondID, tokenId: secondID }],
          })
        )
        const stateAfterTransfers = reducer(
          stateWithNFTs,
          deleteTransferredNFTs([TRANSFER_MOCK])
        )

        const collection = extractCollection(stateAfterTransfers)

        expect(collection).toBeDefined()
        expect(collection?.nftCount).toEqual(1)
        expect(collection?.nfts.length).toEqual(1)
        expect(collection?.nfts[0].id).toBe(secondID)
      })

      it("should handle transfer when it is last NFT owned and cached", () => {
        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([COLLECTION_MOCK])
        )
        const stateWithNFTs = reducer(
          stateWithCollections,
          updateNFTs({
            account: {
              address: OWNER_MOCK,
              network: ETHEREUM,
            },
            collectionID: COLLECTION_MOCK.id,
            hasNextPage: false,
            nfts: [NFT_MOCK],
          })
        )
        const stateAfterTransfers = reducer(
          stateWithNFTs,
          deleteTransferredNFTs([TRANSFER_MOCK])
        )

        const collection = extractCollection(stateAfterTransfers)

        expect(collection).not.toBeDefined()
      })

      it("should handle transfer when transferred NFT is not cached", () => {
        const secondID = "xyz-2"
        const thirdID = "xyz-3"

        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: 3 }])
        )
        const stateWithNFTs = reducer(
          stateWithCollections,
          updateNFTs({
            account: {
              address: OWNER_MOCK,
              network: ETHEREUM,
            },
            collectionID: COLLECTION_MOCK.id,
            hasNextPage: false,
            nfts: [NFT_MOCK, { ...NFT_MOCK, id: secondID, tokenId: secondID }],
          })
        )
        const stateAfterTransfers = reducer(
          stateWithNFTs,
          deleteTransferredNFTs([{ ...TRANSFER_MOCK, id: thirdID }])
        )

        const collection = extractCollection(stateAfterTransfers)

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

        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([
            COLLECTION_MOCK,
            {
              ...COLLECTION_MOCK,
              nftCount: 2,
              id: secondCollectionID,
              name: "ABC",
            },
          ])
        )
        const stateWithNFTs1 = reducer(
          stateWithCollections,
          updateNFTs({
            account: {
              address: OWNER_MOCK,
              network: ETHEREUM,
            },
            collectionID: COLLECTION_MOCK.id,
            hasNextPage: false,
            nfts: [NFT_MOCK],
          })
        )
        const stateWithNFTs2 = reducer(
          stateWithNFTs1,
          updateNFTs({
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
        )
        const stateAfterTransfers = reducer(
          stateWithNFTs2,
          deleteTransferredNFTs([
            TRANSFER_MOCK,
            {
              ...TRANSFER_MOCK,
              id: secondNftID,
              collectionID: secondCollectionID,
            },
          ])
        )

        const firstCollection = extractCollection(stateAfterTransfers)
        const secondCollection = extractCollection(
          stateAfterTransfers,
          secondCollectionID
        )
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

        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: 3 }])
        )
        const stateWithNFTs = reducer(
          stateWithCollections,
          updateNFTs({
            account: {
              address: OWNER_MOCK,
              network: ETHEREUM,
            },
            collectionID: COLLECTION_MOCK.id,
            hasNextPage: false,
            nfts: [
              NFT_MOCK,
              {
                ...NFT_MOCK,
                id: secondID,
                tokenId: secondID,
                name: "XYZ 2 NFT",
              },
              { ...NFT_MOCK, id: thirdID, tokenId: thirdID, name: "XYZ 3 NFT" },
            ],
          })
        )
        const stateAfterTransfers = reducer(
          stateWithNFTs,
          deleteTransferredNFTs([
            TRANSFER_MOCK,
            { ...TRANSFER_MOCK, id: secondID },
          ])
        )

        const collection = extractCollection(stateAfterTransfers)
        const collectionNFTs = collection?.nfts.map((nft) => nft.id)

        expect(collection).toBeDefined()
        expect(collection?.nftCount).toEqual(1)
        expect(collectionNFTs).toContain(thirdID)
      })

      it("should handle transfers of all NFTs owned from the same collection", () => {
        const secondID = "xyz-2"

        const stateWithCollections = reducer(
          state,
          updateNFTsCollections([{ ...COLLECTION_MOCK, nftCount: 2 }])
        )
        const stateWithNFTs = reducer(
          stateWithCollections,
          updateNFTs({
            account: {
              address: OWNER_MOCK,
              network: ETHEREUM,
            },
            collectionID: COLLECTION_MOCK.id,
            hasNextPage: false,
            nfts: [
              NFT_MOCK,
              {
                ...NFT_MOCK,
                id: secondID,
                tokenId: secondID,
                name: "XYZ 2 NFT",
              },
            ],
          })
        )
        const stateAfterTransfers = reducer(
          stateWithNFTs,
          deleteTransferredNFTs([
            TRANSFER_MOCK,
            { ...TRANSFER_MOCK, id: secondID },
          ])
        )

        const collection = extractCollection(stateAfterTransfers)

        expect(collection).not.toBeDefined()
      })
    })
  })
})
