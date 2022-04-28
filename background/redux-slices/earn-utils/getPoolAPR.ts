import { BigNumber } from "ethers"
import { AnyAsset } from "../../assets"
import { HexString } from "../../types"
import { AssetsState } from "../assets"
import { getContract, getCurrentTimestamp } from "../utils/contract-utils"
import VAULT_ABI from "../../lib/vault"
import { doggoTokenDecimalDigits } from "../../constants"
import getDoggoPrice from "./getDoggoPrice"
import getTokenPrice from "./getTokenPrice"
import { sameEVMAddress } from "../../lib/utils"

async function getYearnVaultAPY(yearnVaultAddress: HexString) {
  const yearnVaultsAPIData = await (
    await fetch("https://api.yearn.finance/v1/chains/1/vaults/all")
  ).json()
  const yearnVaultAPY =
    yearnVaultsAPIData.find((yearnVault: { address: HexString }) =>
      sameEVMAddress(yearnVault.address, yearnVaultAddress)
    )?.apy?.net_apy ?? 0
  const yearnVaultAPYPercent = yearnVaultAPY * 100
  return yearnVaultAPYPercent
}

function getYearlyRewardsValue(
  rewardTokenPrice: bigint,
  huntingGroundRemainingRewards: BigNumber,
  periodsPerYear: BigNumber
) {
  const rewardsRemainingValue = huntingGroundRemainingRewards
    .div(BigNumber.from("10").pow(doggoTokenDecimalDigits))
    .mul(rewardTokenPrice)
    .div(BigNumber.from("10").pow(10))
  const totalYearlyRewardsValue = rewardsRemainingValue.mul(periodsPerYear)
  return totalYearlyRewardsValue
}

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
}): Promise<{
  totalAPR: string
  yearnAPY: string
  low?: string
  mid?: string
  high?: string
}> => {
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
  const remainingPeriodSeconds =
    periodEndBN.toNumber() - currentTimestamp > 0
      ? periodEndBN.toNumber() - currentTimestamp
      : 0

  // 2. How much rewards are stored in the hunting ground
  const rewardRate = await huntingGroundContract.rewardRate()
  const huntingGroundRemainingRewards = rewardRate.mul(remainingPeriodSeconds)
  // 3. How many of those periods fit in a year
  const secondsInAYear = BigNumber.from(31556926)
  const periodsPerYear =
    remainingPeriodSeconds > 0
      ? secondsInAYear.div(remainingPeriodSeconds)
      : BigNumber.from(0)
  // 4. What is the value of single reward token in USD bigint with 10 decimals
  const rewardTokenPrice = await getDoggoPrice(assets, mainCurrencySymbol)
  // The doggo price is not available before DAO vote, we will return approximate values
  // The values are in USD with 10 decimals, e.g. 1_000_000_000n = $0.1
  const lowEstimate = 100000000n // $0.01
  const midEstimate = 1000000000n // $0.10
  const highEstimate = 5000000000n // $0.50

  // 5. What is the total value of all tokens to be distributed in given period
  const totalYearlyRewardsValue = getYearlyRewardsValue(
    rewardTokenPrice,
    huntingGroundRemainingRewards,
    periodsPerYear
  )
  const lowYearlyRewardsValue = getYearlyRewardsValue(
    lowEstimate,
    huntingGroundRemainingRewards,
    periodsPerYear
  )
  const midYearlyRewardsValue = getYearlyRewardsValue(
    midEstimate,
    huntingGroundRemainingRewards,
    periodsPerYear
  )
  const highYearlyRewardsValue = getYearlyRewardsValue(
    highEstimate,
    huntingGroundRemainingRewards,
    periodsPerYear
  )
  // 7. How many tokens have been staked into the hunting ground
  const tokensStaked = await huntingGroundContract.totalSupply()
  // 8. What is the value of a single stake token
  const { singleTokenPrice } = await getTokenPrice(asset, assets)
  // 9. Fetch underlying yearn vault APR
  const yearnVaultAddress = await huntingGroundContract.vault()
  const yearnVaultAPYPercent = await getYearnVaultAPY(yearnVaultAddress)
  // 10. What is the total value of all locked tokens
  const tokensStakedValue = tokensStaked
    .mul(BigNumber.from(singleTokenPrice))
    .div(BigNumber.from("10").pow(10 + asset.decimals))
  // Cannot calculate APR if no one has staked tokens
  if (tokensStakedValue.lte(BigNumber.from("0")))
    return {
      totalAPR: `New`,
      low: `New`,
      mid: `New`,
      high: `New`,
      yearnAPY: `${nFormatter(yearnVaultAPYPercent, 1)}%`,
    }
  // 11. What is the totalRewardValue / totalLocked Value ratio
  const rewardRatio = totalYearlyRewardsValue.div(tokensStakedValue)
  const lowRewardRatio = lowYearlyRewardsValue.div(tokensStakedValue)
  const midRewardRatio = midYearlyRewardsValue.div(tokensStakedValue)
  const highRewardRatio = highYearlyRewardsValue.div(tokensStakedValue)
  // 12. Multiply that ratio by 100 to receive percentage
  const percentageAPR = rewardRatio.mul(BigNumber.from(100))
  const lowEstimateAPR = lowRewardRatio.mul(BigNumber.from(100)).toNumber()
  const midEstimateAPR = midRewardRatio.mul(BigNumber.from(100)).toNumber()
  const highEstimateAPR = highRewardRatio.mul(BigNumber.from(100)).toNumber()
  const combinedAPR = percentageAPR.toNumber() + yearnVaultAPYPercent
  return {
    totalAPR: `${nFormatter(combinedAPR, 1)}%`,
    yearnAPY: `${nFormatter(yearnVaultAPYPercent, 1)}%`,
    low: `${nFormatter(lowEstimateAPR, 1)}%`,
    mid: `${nFormatter(midEstimateAPR, 1)}%`,
    high: `${nFormatter(highEstimateAPR, 1)}%`,
  }
}

export default getPoolAPR
