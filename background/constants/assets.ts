import { SmartContractFungibleAsset } from "../assets"
import { ETHEREUM } from "./networks"
import { WEBSITE_ORIGIN } from "./website"

/**
 * The primary token for the wallet's DAO.
 */
// We expect more assets later.
// eslint-disable-next-line import/prefer-default-export
export const DOGGO: SmartContractFungibleAsset = {
  name: "Doggo",
  symbol: "DOGGO",
  decimals: 18,
  contractAddress: "0xdce3d2c2186e3E92af121F477dE76cBED2fc979F",
  homeNetwork: ETHEREUM,
  isTrusted: true,
  metadata: {
    tokenLists: [],
    websiteURL: WEBSITE_ORIGIN,
  },
}
