import { BigNumber } from "ethers"
import { getContract } from "../utils/contract-utils"
import UNISWAP_V2_PAIR from "../../lib/uniswapPair"
import { ETHEREUM } from "../../constants"
import { PricesState, selectAssetPricePoint } from "../prices"

export const DOGGOETH_PAIR = "0x93a08986ec9a74CB9E001702F30202f3749ceDC4"

const getDoggoPrice = async (
  prices: PricesState,
  mainCurrencySymbol: string
): Promise<bigint> => {
  // Fetching price of DOGGO from DOGGO/ETH UniswapV2Pair
  try {
    const doggoUniswapPairContract = await getContract(
      DOGGOETH_PAIR,
      UNISWAP_V2_PAIR.abi
    )
    const reserves = await doggoUniswapPairContract.getReserves()
    const { reserve0, reserve1 } = reserves
    const asset0PricePoint = selectAssetPricePoint(
      prices,
      ETHEREUM.baseAsset,
      mainCurrencySymbol
    )
    if (typeof asset0PricePoint?.amounts[1] === "undefined") return 0n

    const priceOfWethReserve = reserve1.mul(
      BigNumber.from(asset0PricePoint?.amounts[1])
    )
    const amountOfDoggoInPair = reserve0
    const priceOfDoggo = priceOfWethReserve.div(amountOfDoggoInPair)

    return priceOfDoggo.toBigInt()
  } catch {
    return 0n
  }
}

export default getDoggoPrice
