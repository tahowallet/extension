import { BigNumber } from "ethers"
import { HexString } from "../../types"
import { fetchWithTimeout } from "../../utils/fetching"

const getCurveLPTokenPrice = async (wantToken: HexString): Promise<bigint> => {
  const curveCrypto = await fetchWithTimeout(
    "https://api.curve.fi/api/getPools/ethereum/crypto"
  )
  const curveCryptoParsed = await curveCrypto.json()
  const curveFactoryCrypto = await fetchWithTimeout(
    "https://api.curve.fi/api/getPools/ethereum/factory-crypto"
  )
  const curveFactoryCryptoParsed = await curveFactoryCrypto.json()

  const curvePools = [
    ...curveCryptoParsed.data.poolData,
    ...curveFactoryCryptoParsed.data.poolData,
  ]

  const pool = curvePools.find(
    (curvePool) => curvePool.lpTokenAddress === wantToken
  )
  if (typeof pool !== "undefined") {
    // found a curve lp token!
    // 1 LP token is worth total supply / usdTotal
    const totalSupplyDecimals = BigNumber.from(10).pow(BigNumber.from(18))
    const amountOfLPTokens = BigNumber.from(pool.totalSupply).div(
      totalSupplyDecimals
    )

    const LPTokenPrice = BigNumber.from(pool.usdTotal.toFixed()).div(
      amountOfLPTokens
    )

    const standardizedAmount = LPTokenPrice.mul(BigNumber.from("10").pow(10))
    return standardizedAmount.toBigInt()
  }
  return 0n
}

export default getCurveLPTokenPrice
