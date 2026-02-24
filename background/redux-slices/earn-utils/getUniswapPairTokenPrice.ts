import type { HexString } from "../../types"
import { getContract } from "../utils/contract-utils"
import UNISWAP_V2_PAIR from "../../lib/uniswapPair"
import getLPTokenValue from "./getLPTokenValue"
import { PricesState } from "../prices"

const getUniswapPairTokenPrice = async (
  tokenAddress: HexString,
  prices: PricesState,
  mainCurrencySymbol: string,
): Promise<bigint> => {
  const UniswapV2PairContract = await getContract(
    tokenAddress,
    UNISWAP_V2_PAIR.abi,
  )

  const totalLPSupply = await UniswapV2PairContract.totalSupply()
  const LPDecimals = await UniswapV2PairContract.decimals()

  const reserves = await UniswapV2PairContract.getReserves()
  const { reserve0, reserve1 } = reserves

  const token0 = await UniswapV2PairContract.token0()

  const priceFromToken0 = await getLPTokenValue(
    mainCurrencySymbol,
    prices,
    token0,
    reserve0,
    LPDecimals,
    totalLPSupply,
  )

  if (typeof priceFromToken0 !== "undefined") return priceFromToken0

  const token1 = await UniswapV2PairContract.token1()

  const priceFromToken1 = await getLPTokenValue(
    mainCurrencySymbol,
    prices,
    token1,
    reserve1,
    LPDecimals,
    totalLPSupply,
  )

  if (typeof priceFromToken1 !== "undefined") return priceFromToken1

  return 0n
}

export default getUniswapPairTokenPrice
