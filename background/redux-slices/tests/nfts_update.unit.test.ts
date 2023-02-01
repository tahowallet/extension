import { ETHEREUM } from "../../constants"
import { NFTsSliceState, updateCollection } from "../nfts_update"

const OWNER_MOCK = "0x1234"
const COLLECTION_MOCK = {
  id: "1",
  name: "test",
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

      expect(
        state.nfts[ETHEREUM.chainID][OWNER_MOCK][COLLECTION_MOCK.id]
      ).toMatchObject({
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

      const updated =
        state.nfts[ETHEREUM.chainID][OWNER_MOCK][COLLECTION_MOCK.id]

      expect(updated.name).toBe("new")
      expect(updated.floorPrice?.value).toEqual(2)
    })
  })
})
