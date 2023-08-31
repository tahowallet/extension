import { BigNumber } from "ethers"
import { HexString } from "../../types"
import { getContract } from "../utils/contract-utils"
import { ERC20_ABI } from "../../lib/erc20"
import { PricesState, selectAssetPricePoint } from "../prices"

const getLPTokenValue = async (
  mainCurrencySymbol: string,
  prices: PricesState,
  token: HexString,
  reserve: BigNumber,
  LPDecimals: number,
  totalLPSupply: BigNumber,
): Promise<bigint | undefined> => {
  const token0Contract = await getContract(token, ERC20_ABI)
  const token0Symbol = await token0Contract.symbol()

  const assetPricePoint = selectAssetPricePoint(
    prices,
    token0Symbol,
    mainCurrencySymbol,
  )
  if (typeof assetPricePoint?.amounts[1] !== "undefined") {
    const token0Decimals = await token0Contract.decimals()
    const decimalsDifferent = LPDecimals - token0Decimals
    const tokenPrice = assetPricePoint?.amounts[1]
    const tokensInReserve = reserve.mul(BigNumber.from(2))
    const totalReserveValue = tokensInReserve.mul(tokenPrice)
    const missingDecimals = BigNumber.from("10").pow(decimalsDifferent)
    const result =
      decimalsDifferent > 0
        ? totalReserveValue.mul(missingDecimals).div(totalLPSupply)
        : totalReserveValue.div(totalLPSupply)
    return result.toBigInt()
  }
  return undefined
}

export default getLPTokenValue
