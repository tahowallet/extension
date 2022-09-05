import { BigNumber } from "ethers"
import { AnyAsset } from "../../assets"
import { HexString } from "../../types"
import { AssetsState } from "../assets"
import { getContract, getCurrentTimestamp } from "../utils/contract-utils"
import VAULT_ABI from "../../lib/vault"
import { DOGGO } from "../../constants"
import getDoggoPrice from "./getDoggoPrice"
import getTokenPrice from "./getTokenPrice"
import { sameEVMAddress } from "../../lib/utils"
import { fetchWithTimeout } from "../../utils/fetching"

async function getYearnVaultAPY(yearnVaultAddress: HexString) {
  const yearnVaultsAPIData = await (
    await fetchWithTimeout("https://api.yearn.finance/v1/chains/1/vaults/all")
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
    .div(BigNumber.from("10").pow(DOGGO.decimals))
    .mul(rewardTokenPrice)
    .div(BigNumber.from("10").pow(10))
  const totalYearlyRewardsValue = rewardsRemainingValue.mul(periodsPerYear)
  return totalYearlyRewardsValue
}

// Slightly modified version inspired by: https://stackoverflow.com/a/9462382
function numberFormatter(num: number, digits: number) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "K" },
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

const DOGGO_LOW_PRICE_ESTIMATE = 16666666n // $50M valuation
const DOGGO_MID_PRICE_ESTIMATE = 50000000n // $150M valuation
const DOGGO_HIGH_PRICE_ESTIMATE = 250000000n // $750M valuation

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
  totalAPR?: string
  yearnAPY?: string
  low?: string
  mid?: string
  high?: string
}> => {
  const mainCurrencySymbol = "USD" // FIXME Exchange for function returning symbol

  const huntingGroundContract = await getContract(vaultAddress, VAULT_ABI)
  // How many tokens have been staked into the hunting ground
  const tokensStaked = await huntingGroundContract.totalSupply()
  // What is the value of a single stake token
  const { singleTokenPrice } = await getTokenPrice(asset, assets)
  // Fetch underlying yearn vault APR
  const yearnVaultAddress = await huntingGroundContract.vault()
  const yearnVaultAPYPercent = await getYearnVaultAPY(yearnVaultAddress)
  //  What is the total value of all locked tokens
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
      yearnAPY: `${numberFormatter(yearnVaultAPYPercent, 1)}%`,
    }
  // How long will the rewards be distributed for in seconds
  const currentTimestamp = await getCurrentTimestamp()
  const periodEndBN = await huntingGroundContract.periodFinish()
  const remainingPeriodSeconds =
    periodEndBN.toNumber() - currentTimestamp > 0
      ? periodEndBN.toNumber() - currentTimestamp
      : 0

  // How much rewards are stored in the hunting ground
  const rewardRate = await huntingGroundContract.rewardRate()
  const huntingGroundRemainingRewards = rewardRate.mul(remainingPeriodSeconds)
  // How many of those periods fit in a year
  const secondsInAYear = BigNumber.from(31556926)
  const periodsPerYear =
    remainingPeriodSeconds > 0
      ? secondsInAYear.div(remainingPeriodSeconds)
      : BigNumber.from(0)
  // What is the value of single reward token in USD bigint with 10 decimals
  const rewardTokenPrice = await getDoggoPrice(assets, mainCurrencySymbol)
  // The doggo price is not available before DAO vote, we will return approximate values
  // The values are in USD with 10 decimals, e.g. 1_000_000_000n = $0.1

  const [percentageAPR, lowEstimateAPR, midEstimateAPR, highEstimateAPR] = [
    rewardTokenPrice,
    DOGGO_LOW_PRICE_ESTIMATE,
    DOGGO_MID_PRICE_ESTIMATE,
    DOGGO_HIGH_PRICE_ESTIMATE,
  ].map((estimate: bigint) => {
    // What is the total value of all tokens to be distributed in given period
    const yearlyRewardsValue = getYearlyRewardsValue(
      estimate,
      huntingGroundRemainingRewards,
      periodsPerYear
    )
    const rewardRatio = yearlyRewardsValue.div(tokensStakedValue)
    // Multiply that ratio by 100 to receive percentage
    const estimateAPR = rewardRatio.mul(BigNumber.from(100)).toNumber()
    const totalEstimateAPR = estimateAPR + yearnVaultAPYPercent
    return totalEstimateAPR
  })
  if (rewardTokenPrice === 0n) {
    return {
      totalAPR: undefined,
      yearnAPY: `${numberFormatter(yearnVaultAPYPercent, 1)}%`,
      low: `${numberFormatter(lowEstimateAPR, 1)}%`,
      mid: `${numberFormatter(midEstimateAPR, 1)}%`,
      high: `${numberFormatter(highEstimateAPR, 1)}%`,
    }
  }
  return {
    totalAPR: `${numberFormatter(percentageAPR, 1)}%`,
    yearnAPY: `${numberFormatter(yearnVaultAPYPercent, 1)}%`,
    low: `${numberFormatter(lowEstimateAPR, 1)}%`,
    mid: `${numberFormatter(midEstimateAPR, 1)}%`,
    high: `${numberFormatter(highEstimateAPR, 1)}%`,
  }
}

export default getPoolAPR
