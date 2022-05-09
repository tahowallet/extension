import { SmartContractFungibleAsset } from "../assets"
import { ETHEREUM } from "./networks"

/**
 * The primary token for the wallet's DAO.
 */
// We expect more assets later.
// eslint-disable-next-line import/prefer-default-export
export const DOGGO: SmartContractFungibleAsset = {
  name: "Doggo",
  symbol: "DOGGO",
  decimals: 18,
  contractAddress: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
  homeNetwork: ETHEREUM,
  metadata: {
    tokenLists: [],
    websiteURL: "https://tallyho.cash",
  },
}
