import { PricePoint, SmartContractFungibleAsset } from "../../assets"
import { ETHEREUM } from "../../constants"
import { PricesState } from "../../redux-slices/prices"
import { getFullAssetID } from "../../redux-slices/utils/asset-utils"

export const assets: SmartContractFungibleAsset[] = [
  {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    homeNetwork: ETHEREUM,
    contractAddress: "0x0",
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    decimals: 18,
    homeNetwork: ETHEREUM,
    contractAddress: "0x0",
  },
]

export const prices: PricesState = {
  [getFullAssetID(assets[0])]: {
    USD: {
      pair: [
        {
          contractAddress: "0x0",
          decimals: 18,
          homeNetwork: ETHEREUM,
          name: "Wrapped Ether",
          symbol: "WETH",
        },
        {
          name: "United States Dollar",
          symbol: "USD",
          decimals: 10,
        },
      ],
      amounts: [1000000000000000000n, 31288400000000n],
      time: 1650540050,
    } as PricePoint,
  },
  [getFullAssetID(assets[1])]: {
    USD: {
      pair: [
        {
          name: "Uniswap",
          symbol: "UNI",
          decimals: 18,
          homeNetwork: ETHEREUM,
          contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        },
        {
          name: "United States Dollar",
          symbol: "USD",
          decimals: 10,
        },
      ],
      amounts: [1000000000000000000n, 90000000000n],
      time: 1650618496,
    } as PricePoint,
  },
}
