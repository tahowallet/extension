import { BigNumber } from "ethers"
import { AnyAsset } from "../../assets"
import { HexString } from "../../types"
import { AssetsState } from "../assets"
import { getContract, getCurrentTimestamp } from "../utils/contract-utils"
import VAULT_ABI from "../../lib/vault"
import { doggoTokenDecimalDigits } from "../../constants"
import getDoggoPrice from "./getDoggoPrice"
import getTokenPrice from "./getTokenPrice"

const getPoolAPR = async ({
  asset,
  assets,
  vaultAddress,
}: {
  asset: AnyAsset & {
    decimals: number
    contractAddress: HexString
  }
  assets: AssetsState
  vaultAddress: HexString
}): Promise<string> => {
  // Slightly modified version inspired by: https://stackoverflow.com/a/9462382
  function nFormatter(num: number, digits: number) {
    const lookup = [
      { value: 1, symbol: "" },
      { value: 1e3, symbol: "k" },
      { value: 1e6, symbol: "M" },
      { value: 1e9, symbol: "B" },
    ]
    const item = lookup
      .slice()
      .reverse()
      .find(function check(item1) {
        return num >= item1.value
      })
    return item ? (num / item.value).toFixed(digits) + item.symbol : "0"
  }

  const mainCurrencySymbol = "USD" // FIXME Exchange for function returning symbol

  // 1. How long will the rewards be distributed for in seconds
  const huntingGroundContract = await getContract(vaultAddress, VAULT_ABI)
  const currentTimestamp = await getCurrentTimestamp()
  const periodEndBN = await huntingGroundContract.periodFinish()
  const remainingPeriodSeconds = periodEndBN.toNumber() - currentTimestamp

  // 2. How much rewards are stored in the hunting ground
  const rewardRate = await huntingGroundContract.rewardRate()
  const huntingGroundRemainingRewards = rewardRate.mul(remainingPeriodSeconds)
  // 3. How many of those periods fit in a year
  const secondsInAYear = BigNumber.from(31556926)
  const periodsPerYear = secondsInAYear.div(remainingPeriodSeconds)
  // 4. What is the value of single reward token in USD bigint with 10 decimals
  const rewardTokenPrice = await getDoggoPrice(assets, mainCurrencySymbol)
  // 5. What is the total value of all tokens to be distributed in given period
  const rewardsRemainingValue = huntingGroundRemainingRewards
    .div(BigNumber.from("10").pow(doggoTokenDecimalDigits))
    .mul(rewardTokenPrice)
    .div(BigNumber.from("10").pow(10))

  // 6. Multiply the above value by number of periods fitting in a year
  const totalYearlyRewardsValue = rewardsRemainingValue.mul(periodsPerYear)
  // 7. How many tokens have been staked into the hunting ground
  const tokensStaked = await huntingGroundContract.totalSupply()
  // 8. What is the value of a single stake token
  const { singleTokenPrice } = await getTokenPrice(asset, assets)

  // 9. What is the total value of all locked tokens
  const tokensStakedValue = tokensStaked
    .mul(BigNumber.from(singleTokenPrice))
    .div(BigNumber.from("10").pow(10 + asset.decimals))
  // Cannot calculate APR if no one has staked tokens
  if (tokensStakedValue.lte(BigNumber.from("0"))) return "New"
  // 10. What is the totalRewardValue / totalLocked Value ratio
  const rewardRatio = totalYearlyRewardsValue.div(tokensStakedValue)
  // 11. Multiply that ratio by 100 to receive percentage
  const percentageAPR = rewardRatio.mul(BigNumber.from(100))
  return `${nFormatter(percentageAPR.toNumber(), 1)}%`
}

export default getPoolAPR
