import { TransactionResponse } from "@ethersproject/abstract-provider"
import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"
import { parseUnits } from "ethers/lib/utils"
import Emittery from "emittery"

import { AnyAsset, PricePoint } from "../assets"
import { USE_MAINNET_FORK } from "../features/features"
import { ERC20_ABI } from "../lib/erc20"
import { fromFixedPointNumber } from "../lib/fixed-point"
import VAULT_ABI from "../lib/vault"
import APPROVAL_TARGET_ABI from "../lib/approvalTarget"
import { HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"
import {
  getContract,
  getCurrentTimestamp,
  getProvider,
  getSignerAddress,
} from "./utils/contract-utils"
import { AssetsState, selectAssetPricePoint } from "./assets"
import { enrichAssetAmountWithMainCurrencyValues } from "./utils/asset-utils"
import { doggoTokenDecimalDigits, ETHEREUM } from "../constants"
import { EVMNetwork } from "../networks"
import YEARN_VAULT_ABI from "../lib/yearnVault"
import UNISWAP_V2_PAIR from "../lib/uniswapPair"

export type ApprovalTargetAllowance = {
  contractAddress: HexString
  allowance: number
}

export type AvailableVault = {
  network: EVMNetwork
  vaultAddress: HexString
  userDeposited: bigint
  totalDeposited: bigint
  yearnVault: HexString
  asset: AnyAsset & { contractAddress: string; decimals: number }
  pendingRewards: bigint
  poolStartTime: number
  poolEndTime: number
  duration: number
  rewardToken: HexString
  totalRewards: bigint
  APR?: string
  localValueUserDeposited?: string
  localValueTotalDeposited?: string
  numberValueUserDeposited?: number
  numberValueTotalDeposited?: number
}

export type EnrichedAvailableVault = AvailableVault & {
  localValueUserDeposited: string
  localValueTotalDeposited: string
  numberValueUserDeposited: number
  numberValueTotalDeposited: number
}

export type EarnState = {
  signature: Signature
  approvalTargetAllowances: ApprovalTargetAllowance[]
  availableVaults: AvailableVault[]
  currentlyDepositing: boolean
  currentlyApproving: boolean
  depositError: boolean
  inputAmount: string
  depositingProcess: boolean
}

export type Signature = {
  r: string | undefined
  s: string | undefined
  v: number | undefined
  deadline: number | undefined
}

export type Events = {
  earnDeposit: string
}

export const initialVaults: AvailableVault[] = [
  {
    network: ETHEREUM,
    vaultAddress: "0x50bEB34F588e914f2c754EB208D2E575C9330d13",
    yearnVault: "0xd9788f3931Ede4D5018184E198699dC6d66C1915",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847661,
    poolEndTime: 1651057261,
    asset: {
      name: "Aave Token",
      symbol: "AAVE",
      decimals: 18,
      contractAddress: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x9f4723C73F80eDA774977C6dEA476367D5272dD1",
    yearnVault: "0xFBEB78a723b8087fD2ea7Ef1afEc93d35E8Bed42",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847666,
    poolEndTime: 1651057266,
    asset: {
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x5F33141443497fBe2b313b0B286D9E4bB1cd5480",
    yearnVault: "0x1635b506a88fBF428465Ad65d00e8d6B6E5846C3",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847671,
    poolEndTime: 1651057271,
    asset: {
      name: "Curve CVX-ETH",
      symbol: "crvCVXETH",
      decimals: 18,
      contractAddress: "0x3A283D9c08E8b55966afb64C515f5143cf907611",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x7289dd11255AD50cC2c4d84089756C7D3D4318A1",
    yearnVault: "0x790a60024bC3aea28385b60480f15a0771f26D09",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847676,
    poolEndTime: 1651057276,
    asset: {
      name: "Curve.fi Factory Crypto Pool: YFI/ETH",
      symbol: "YFIETH-f",
      decimals: 18,
      contractAddress: "0x29059568bB40344487d62f7450E78b8E6C74e0e5",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xc2ef1f79e591Bc5D7021B3CAd6B2c844Dde057E4",
    yearnVault: "0xF29AE508698bDeF169B89834F76704C3B205aedf",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847681,
    poolEndTime: 1651057281,
    asset: {
      name: "Synthetix Network Token",
      symbol: "SNX",
      decimals: 18,
      contractAddress: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xAa9BBFd49A35a0DbAf6cd4aA3d712e40b492a6DB",
    yearnVault: "0x6d765CbE5bC922694afE112C140b8878b9FB0390",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847686,
    poolEndTime: 1651057286,
    asset: {
      name: "SushiToken",
      symbol: "SUSHI",
      decimals: 18,
      contractAddress: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xDfC890055A66e70e9c717CFC0fF2AEcE507db417",
    yearnVault: "0x67B9F46BCbA2DF84ECd41cC6511ca33507c9f4E9",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847689,
    poolEndTime: 1651057289,
    asset: {
      name: "LooksRare Token",
      symbol: "LOOKS",
      decimals: 18,
      contractAddress: "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xd3aaB42b90aAA123D17684E9D7C5fE1a9E7ae811",
    yearnVault: "0xD4108Bb1185A5c30eA3f4264Fd7783473018Ce17",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847694,
    poolEndTime: 1651057294,
    asset: {
      name: "KEEP Token",
      symbol: "KEEP",
      decimals: 18,
      contractAddress: "0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0x6e3f0F5fDAE6e9f817D0146F974E34Bcd8346A83",
    yearnVault: "0xB364D19c3FF37e0fa4B94bf4cf626729533C1c26",
    duration: 1209600,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847699,
    poolEndTime: 1651057299,
    asset: {
      name: "Curve T-ETH",
      symbol: "crvTETH",
      decimals: 18,
      contractAddress: "0xCb08717451aaE9EF950a2524E33B6DCaBA60147B",
    },
    totalRewards: BigNumber.from("0x165a0bc0").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
  {
    network: ETHEREUM,
    vaultAddress: "0xd7E1E50BeD44F4F3663478990573DbCa7F8a1DA9",
    yearnVault: "0x5faF6a2D186448Dfa667c51CB3D695c7A6E52d8E",
    duration: 2592000,
    rewardToken: "0xA0DDAEd22e3a8aa512C85a13F426165861922801",
    poolStartTime: 1649847704,
    poolEndTime: 1652439704,
    asset: {
      name: "Uniswap V2",
      symbol: "UNI-V2",
      decimals: 18,
      contractAddress: "0x93a08986ec9a74CB9E001702F30202f3749ceDC4",
    },
    totalRewards: BigNumber.from("0x8f0d1800").toBigInt(),
    userDeposited: 0n,
    totalDeposited: 0n,
    pendingRewards: 0n,
  },
]

export const emitter = new Emittery<Events>()

export const initialState: EarnState = {
  signature: {
    r: undefined,
    s: undefined,
    v: undefined,
    deadline: undefined,
  },
  approvalTargetAllowances: [],
  availableVaults: initialVaults,
  currentlyDepositing: false,
  currentlyApproving: false,
  depositError: false,
  inputAmount: "",
  depositingProcess: false,
}

const APPROVAL_TARGET_CONTRACT_ADDRESS =
  "0x73B6dF83e5fCD0B95989B152Da19f5328dCa8a9A"
const DOGGOETH_PAIR = "0x93a08986ec9a74CB9E001702F30202f3749ceDC4"

const earnSlice = createSlice({
  name: "earn",
  initialState,
  reducers: {
    saveSignature: (
      state,
      { payload: { r, s, v, deadline } }: { payload: Signature }
    ) => ({
      ...state,
      signature: { r, s, v, deadline },
    }),
    clearSignature: (state) => ({
      ...state,
      signature: {
        r: undefined,
        s: undefined,
        v: undefined,
        deadline: undefined,
      },
    }),
    clearInput: (state) => ({
      ...state,
      inputAmount: "",
    }),
    currentlyDepositing: (immerState, { payload }: { payload: boolean }) => {
      immerState.currentlyDepositing = payload
    },
    depositProcess: (immerState, { payload }: { payload: boolean }) => {
      immerState.depositingProcess = payload
    },
    currentlyApproving: (immerState, { payload }: { payload: boolean }) => {
      immerState.currentlyApproving = payload
    },
    inputAmount: (state, { payload }: { payload: string }) => {
      return {
        ...state,
        inputAmount: payload,
      }
    },
    updateVaultsStats: (state, { payload }: { payload: AvailableVault[] }) => {
      return {
        ...state,
        availableVaults: state.availableVaults.map((availableVault) => {
          const currentVault = payload.find(
            (updatedVault) =>
              availableVault.vaultAddress === updatedVault.vaultAddress
          )
          return currentVault || availableVault
        }),
      }
    },
    depositError: (immerState, { payload }: { payload: boolean }) => {
      immerState.depositError = payload
    },
    saveAllowance: (
      state,
      {
        payload,
      }: { payload: { contractAddress: HexString; allowance: number } }
    ) => {
      const { contractAddress, allowance } = payload
      return {
        ...state,
        approvalTargetAllowances: [
          ...state.approvalTargetAllowances,
          { contractAddress, allowance },
        ],
      }
    },
  },
})

export const {
  saveSignature,
  saveAllowance,
  currentlyDepositing,
  currentlyApproving,
  depositError,
  updateVaultsStats,
  inputAmount,
  clearSignature,
  clearInput,
  depositProcess,
} = earnSlice.actions

export default earnSlice.reducer

const getDoggoPrice = async (
  assets: AssetsState,
  mainCurrencySymbol: string
) => {
  // Fetching price of DOGGO from DOGGO/ETH UniswapV2Pair
  try {
    const doggoUniswapPairContract = await getContract(
      DOGGOETH_PAIR,
      UNISWAP_V2_PAIR.abi
    )
    const reserves = await doggoUniswapPairContract.getReserves()
    const { reserve0, reserve1 } = reserves
    const asset0PricePoint = selectAssetPricePoint(
      assets,
      "WETH",
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

const getLPTokenValue = async (
  mainCurrencySymbol: string,
  assets: AssetsState,
  token: HexString,
  reserve: BigNumber,
  LPDecimals: number,
  totalLPSupply: BigNumber
): Promise<bigint | undefined> => {
  const token0Contract = await getContract(token, ERC20_ABI)
  const token0Symbol = await token0Contract.symbol()

  const assetPricePoint = selectAssetPricePoint(
    assets,
    token0Symbol,
    mainCurrencySymbol
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

const getUniswapPairTokenPrice = async (
  tokenAddress: HexString,
  assets: AssetsState,
  mainCurrencySymbol: string
): Promise<bigint> => {
  const UniswapV2PairContract = await getContract(
    tokenAddress,
    UNISWAP_V2_PAIR.abi
  )

  const totalLPSupply = await UniswapV2PairContract.totalSupply()
  const LPDecimals = await UniswapV2PairContract.decimals()

  const reserves = await UniswapV2PairContract.getReserves()
  const { reserve0, reserve1 } = reserves

  const token0 = await UniswapV2PairContract.token0()

  const priceFromToken0 = await getLPTokenValue(
    mainCurrencySymbol,
    assets,
    token0,
    reserve0,
    LPDecimals,
    totalLPSupply
  )

  if (typeof priceFromToken0 !== "undefined") return priceFromToken0

  const token1 = await UniswapV2PairContract.token1()

  const priceFromToken1 = await getLPTokenValue(
    mainCurrencySymbol,
    assets,
    token1,
    reserve1,
    LPDecimals,
    totalLPSupply
  )

  if (typeof priceFromToken1 !== "undefined") return priceFromToken1

  return 0n
}

const getCurveLPTokenPrice = async (wantToken: HexString) => {
  const curveCrypto = await fetch(
    "https://api.curve.fi/api/getPools/ethereum/crypto"
  )
  const curveCryptoParsed = await curveCrypto.json()
  const curveFactoryCrypto = await fetch(
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

export const getTokenPrice = async (
  asset: AnyAsset & { decimals: number; contractAddress: HexString },
  assets: AssetsState
): Promise<{ singleTokenPrice: bigint; pricePoint: PricePoint }> => {
  const mainCurrencySymbol = "USD"
  let tokenPrice
  if (asset.symbol.startsWith("crv") || asset.symbol.startsWith("YFIETH")) {
    tokenPrice = await getCurveLPTokenPrice(asset.contractAddress) // in USD bigint with 10 decimals
  } else if (asset.symbol.startsWith("UNI-V2")) {
    tokenPrice = await getUniswapPairTokenPrice(
      asset.contractAddress,
      assets,
      mainCurrencySymbol
    ) // in USD bigint with 10 decimals
  } else {
    // assetPricePoint.amounts[1] returns USD value with 10 decimals
    const assetPricePoint = selectAssetPricePoint(
      assets,
      asset.symbol,
      mainCurrencySymbol
    )
    tokenPrice = assetPricePoint?.amounts[1]

    if (typeof tokenPrice === "undefined") {
      tokenPrice = 0n
    }
  }
  const bigIntDecimals = BigNumber.from("10")
    .pow(BigNumber.from(asset.decimals))
    .toBigInt()
  const USDAsset = {
    name: "United States Dollar",
    symbol: "USD",
    decimals: 10,
  }
  const imitatedPricePoint = {
    pair: [asset, USDAsset],
    amounts: [bigIntDecimals, tokenPrice],
    time: Date.now(),
  } as PricePoint

  return { singleTokenPrice: tokenPrice, pricePoint: imitatedPricePoint }
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

export const updateVaults = createBackgroundAsyncThunk(
  "earn/updateLockedValues",
  async (vaultsToUpdate: AvailableVault[], { getState, dispatch }) => {
    const currentState = getState()
    const { assets } = currentState as {
      earn: EarnState
      assets: AssetsState
    }
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = signer.getAddress()

    const vaultsWithNewValues = vaultsToUpdate.map(async (vault) => {
      const vaultContract = await getContract(vault.vaultAddress, VAULT_ABI)
      const userLockedValue: BigNumber = await vaultContract.balanceOf(account)
      const yearnVaultContract = await getContract(
        vault.yearnVault,
        YEARN_VAULT_ABI
      )
      const pricePerShare = await yearnVaultContract.pricePerShare()
      const yearnVaultDecimals = await yearnVaultContract.decimals()
      const newUserLockedValue = userLockedValue
        .mul(pricePerShare)
        .div(BigNumber.from("10").pow(yearnVaultDecimals))
      const totalSupply: BigNumber = await vaultContract.totalSupply()
      const newTotalTVL = totalSupply
        .mul(pricePerShare)
        .div(BigNumber.from("10").pow(yearnVaultDecimals))

      const earned: BigNumber = await vaultContract.earned(account)

      const vaultAPR = await getPoolAPR({
        asset: vault.asset,
        assets,
        vaultAddress: vault.vaultAddress,
      })

      const { pricePoint } = await getTokenPrice(vault.asset, assets)
      const userTVL = enrichAssetAmountWithMainCurrencyValues(
        { amount: vault.userDeposited, asset: vault.asset },
        pricePoint,
        2
      )
      const totalTVL = enrichAssetAmountWithMainCurrencyValues(
        { amount: vault.totalDeposited, asset: vault.asset },
        pricePoint,
        2
      )

      return {
        ...vault,
        userDeposited: newUserLockedValue.toBigInt(),
        totalDeposited: newTotalTVL.toBigInt(),
        pendingRewards: earned.toBigInt(),
        localValueUserDeposited: userTVL.localizedMainCurrencyAmount,
        localValueTotalDeposited: totalTVL.localizedMainCurrencyAmount,
        numberValueUserDeposited: userTVL.mainCurrencyAmount,
        numberValueTotalDeposited: totalTVL.mainCurrencyAmount,
        APR: vaultAPR,
      }
    })
    const updatedVaults = await Promise.all(vaultsWithNewValues)
    dispatch(updateVaultsStats(updatedVaults))
    return updatedVaults
  }
)

export const vaultWithdraw = createBackgroundAsyncThunk(
  "earn/vaultWithdraw",
  async ({ vault }: { vault: AvailableVault }, { dispatch }) => {
    const vaultContract = await getContract(vault.vaultAddress, VAULT_ABI)

    // TODO Support partial withdrawal
    // const withdrawAmount = parseUnits(amount, vault.asset.decimals)

    const tx = await vaultContract.functions["withdraw()"]()
    const receipt = await tx.wait()
    if (receipt.status === 1) {
      dispatch(updateVaults([vault]))
    }
  }
)

export const vaultDeposit = createBackgroundAsyncThunk(
  "signing/vaultDeposit",
  async (
    {
      vault,
      amount,
    }: {
      vault: AvailableVault
      amount: string
      tokenAddress: HexString
    },
    { getState, dispatch }
  ) => {
    dispatch(depositProcess(false))
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()

    const state = getState()
    const { earn } = state as { earn: EarnState }

    const { signature } = earn

    const { vaultAddress } = vault

    const depositAmount = parseUnits(amount, vault.asset.decimals)

    const vaultContract = await getContract(vaultAddress, VAULT_ABI)

    const depositTransactionData =
      await vaultContract.populateTransaction.depositWithApprovalTarget(
        depositAmount,
        signerAddress,
        signerAddress,
        depositAmount,
        ethers.BigNumber.from(signature.deadline),
        signature.v,
        signature.r,
        signature.s
      )
    if (USE_MAINNET_FORK) {
      depositTransactionData.gasLimit = BigNumber.from(850000) // for mainnet fork only
    }
    dispatch(clearInput())
    try {
      const response = await signer.sendTransaction(depositTransactionData)
      dispatch(currentlyDepositing(true))
      const receipt = await response.wait()
      if (receipt.status === 1) {
        dispatch(currentlyDepositing(false))
        dispatch(clearSignature())
        dispatch(updateVaults([vault]))
        await emitter.emit("earnDeposit", "Asset successfully deposited")
        return
      }
      throw new Error()
    } catch {
      await emitter.emit("earnDeposit", "Asset deposit has failed")
      dispatch(clearSignature())
      dispatch(currentlyDepositing(false))
      dispatch(dispatch(depositError(true)))
    }
  }
)

export const claimVaultRewards = createBackgroundAsyncThunk(
  "earn/clamRewards",
  async (vault: AvailableVault, { dispatch }) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    const vaultContract = new ethers.Contract(
      vault.vaultAddress,
      VAULT_ABI,
      signer
    )
    const tx = await vaultContract.functions["getReward()"]()
    const response = signer.sendTransaction(tx)
    await tx.wait(response)
    dispatch(updateVaults([vault]))
  }
)

export const approveApprovalTarget = createBackgroundAsyncThunk(
  "earn/approveApprovalTarget",
  async (
    tokenContractAddress: HexString,
    { dispatch }
  ): Promise<TransactionResponse | undefined> => {
    dispatch(currentlyApproving(true))
    const provider = getProvider()
    const signer = provider.getSigner()

    const assetContract = await getContract(tokenContractAddress, ERC20_ABI)

    const approvalTransactionData =
      await assetContract.populateTransaction.approve(
        APPROVAL_TARGET_CONTRACT_ADDRESS,
        ethers.constants.MaxUint256
      )
    try {
      if (USE_MAINNET_FORK) {
        approvalTransactionData.gasLimit = BigNumber.from(350000) // for mainnet fork only
      }
      const tx = await signer.sendTransaction(approvalTransactionData)
      await tx.wait()
      dispatch(currentlyApproving(false))
      return tx
    } catch (error) {
      dispatch(currentlyApproving(false))
      return undefined
    }
  }
)

export const checkApprovalTargetApproval = createBackgroundAsyncThunk(
  "earn/checkApprovalTargetApproval",
  async (tokenContractAddress: HexString) => {
    const assetContract = await getContract(tokenContractAddress, ERC20_ABI)
    const signerAddress = await getSignerAddress()
    try {
      const allowance: BigNumber = await assetContract.allowance(
        signerAddress,
        APPROVAL_TARGET_CONTRACT_ADDRESS
      )
      const amount = fromFixedPointNumber(
        { amount: allowance.toBigInt(), decimals: 18 },
        2
      )
      return {
        contractAddress: tokenContractAddress,
        allowance: amount,
      } as ApprovalTargetAllowance
    } catch (err) {
      return undefined
    }
  }
)

export const permitVaultDeposit = createBackgroundAsyncThunk(
  "earn/permitVaultDeposit",
  async (
    {
      vault,
      amount,
      tokenAddress,
    }: {
      vault: AvailableVault
      amount: string
      tokenAddress: HexString
    },
    { dispatch }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()
    const chainID = await signer.getChainId()

    const depositAmount = parseUnits(amount, vault.asset.decimals)

    const ApprovalTargetContract = await getContract(
      APPROVAL_TARGET_CONTRACT_ADDRESS,
      APPROVAL_TARGET_ABI
    )

    const timestamp = await getCurrentTimestamp()
    const deadline = timestamp + 12 * 60 * 60

    const nonceValue = await ApprovalTargetContract.nonces(signerAddress)
    const types = {
      PermitAndTransferFrom: [
        { name: "erc20", type: "address" },
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    }
    const domain = {
      name: "ApprovalTarget",
      chainId: USE_MAINNET_FORK ? 1337 : chainID,
      version: "1",
      verifyingContract: APPROVAL_TARGET_CONTRACT_ADDRESS,
    }
    const message = {
      erc20: tokenAddress,
      owner: signerAddress,
      spender: vault.vaultAddress,
      value: depositAmount,
      nonce: nonceValue,
      deadline: ethers.BigNumber.from(deadline),
    }

    // _signTypedData is the ethers function name, once the official release will be ready _ will be dropped
    // eslint-disable-next-line no-underscore-dangle
    const tx = await signer._signTypedData(domain, types, message)

    const splitSignature = ethers.utils.splitSignature(tx)
    const { r, s, v } = splitSignature

    dispatch(earnSlice.actions.saveSignature({ r, s, v, deadline }))
    dispatch(depositProcess(true))
  }
)
export const selectApprovalTargetApprovals = createSelector(
  (state: { earn?: EarnState | undefined }) => {
    if (state.earn) {
      return state.earn.approvalTargetAllowances
    }
    return undefined
  },
  (approvals) => approvals
)

export const selectCurrentlyApproving = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState?.currentlyApproving
)

export const selectCurrentlyDepositing = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState.currentlyDepositing
)

export const selectAvailableVaults = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState.availableVaults
)

export const selectSignature = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => {
    if (
      typeof earnState.signature.r !== "undefined" &&
      typeof earnState.signature.v !== "undefined" &&
      typeof earnState.signature.s !== "undefined" &&
      typeof earnState.signature.deadline !== "undefined"
    ) {
      return earnState.signature
    }
    return undefined
  }
)

export const selectEarnInputAmount = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState.inputAmount
)

export const selectDepositingProcess = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState.depositingProcess
)
