import { ETHEREUM } from "../../constants"
import { NFT, TransferredNFT } from "../../nfts"
import { NFTCollectionCached, NFTsSliceState } from "../nfts"

export const OWNER_MOCK = "0x1234"
export const RECEIVER_MOCK = "0xABCD"
export const COLLECTION_MOCK = {
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
export const NFT_MOCK: NFT = {
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
export const TRANSFER_MOCK: TransferredNFT = {
  id: NFT_MOCK.id,
  collectionID: COLLECTION_MOCK.id,
  chainID: ETHEREUM.chainID,
  from: OWNER_MOCK,
  to: RECEIVER_MOCK,
  isKnownFromAddress: true,
  isKnownToAddress: false,
}

export const extractCollection = (
  state: NFTsSliceState,
  collectionID: string = COLLECTION_MOCK.id,
  chainID: string = ETHEREUM.chainID,
  address: string = OWNER_MOCK
): NFTCollectionCached | undefined =>
  state.nfts?.[chainID]?.[address]?.[collectionID]
