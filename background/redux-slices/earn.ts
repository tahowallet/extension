import { TransactionResponse } from "@ethersproject/abstract-provider"
import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"
import { parseUnits } from "ethers/lib/utils"
import Emittery from "emittery"

import { AnyAsset } from "../assets"
import { USE_MAINNET_FORK } from "../features"
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
import { AssetsState } from "./assets"
import { enrichAssetAmountWithMainCurrencyValues } from "./utils/asset-utils"
import { ETHEREUM } from "../constants"
import { EVMNetwork } from "../networks"
import YEARN_VAULT_ABI from "../lib/yearnVault"
import { getPoolAPR, getTokenPrice } from "./earn-utils"

export type ApprovalTargetAllowance = {
  contractAddress: HexString
  allowance: number
}

export type APRData = {
  totalAPR?: string
  yearnAPY?: string
  low?: string
  mid?: string
  high?: string
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
  APR?: APRData
  icons?: string[]
  localValueUserDeposited?: string
  localValueTotalDeposited?: string
  numberValueUserDeposited?: number
  numberValueTotalDeposited?: number
  managementFee?: string
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
  isVaultDataStale: boolean
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
    icons: ["https://cryptologos.cc/logos/thumbs/aave.png?v=022"],
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
    icons: ["ipfs://QmXttGpZrECX5qCyXbBQiqgQNytVGeZW5Anewvh2jc4psg"],
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
    icons: [
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      "ipfs://bafybeicpyu35mpptkxvbcfbzmlaefiqlj7layt5oolcbjh5cc5vfkyi7c4",
    ],
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
    icons: [
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      "https://cryptologos.cc/logos/thumbs/yearn-finance.png?v=022",
    ],
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
    icons: [
      "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F/logo.png",
    ],
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
    icons: ["https://cryptologos.cc/logos/thumbs/sushiswap.png?v=022"],
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
    icons: [
      "ipfs://bafybeia64nloazn7cxgwema5o26l2zjbxufb5kb5dxea6dbpretuxoappq",
    ],
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
    icons: ["https://s2.coinmarketcap.com/static/img/coins/64x64/5566.png"],
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
    icons: [
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      "ipfs://bafybeib53hx56um4xexwtaqjo3u3ridppnpblfucqdbotwlqcadlfyc2a4",
    ],
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
    icons: [
      "https://assets.coingecko.com/coins/images/279/small/ethereum.png?1595348880",
      "https://avatars.githubusercontent.com/u/77035304?s=200&v=4",
    ],
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
  isVaultDataStale: true,
  currentlyDepositing: false,
  currentlyApproving: false,
  depositError: false,
  inputAmount: "",
  depositingProcess: false,
}

const APPROVAL_TARGET_CONTRACT_ADDRESS =
  "0x73B6dF83e5fCD0B95989B152Da19f5328dCa8a9A"

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
    setVaultsAsStale: (state) => {
      return {
        ...state,
        isVaultDataStale: true,
      }
    },
    updateVaultsStats: (state, { payload }: { payload: AvailableVault[] }) => {
      return {
        ...state,
        isVaultDataStale: false,
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
  setVaultsAsStale,
  updateVaultsStats,
  inputAmount,
  clearSignature,
  clearInput,
  depositProcess,
} = earnSlice.actions

export default earnSlice.reducer

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
    const account = await signer.getAddress()

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
        { amount: newUserLockedValue.toBigInt(), asset: vault.asset },
        pricePoint,
        2
      )
      const totalTVL = enrichAssetAmountWithMainCurrencyValues(
        { amount: newTotalTVL.toBigInt(), asset: vault.asset },
        pricePoint,
        2
      )

      // TODO Check if management fee can change, if not => hardcode it
      const targetManagementFee = (
        await vaultContract.targetManagementFee()
      ).toNumber()
      const MANAGEMENT_FEE_DIVISOR = 100_000
      const yearlyManagementFee = targetManagementFee / MANAGEMENT_FEE_DIVISOR
      return {
        ...vault,
        userDeposited: newUserLockedValue.toBigInt(),
        totalDeposited: newTotalTVL.toBigInt(),
        pendingRewards: earned.toBigInt(),
        localValueUserDeposited: userTVL.localizedMainCurrencyAmount,
        localValueTotalDeposited: totalTVL.localizedMainCurrencyAmount,
        numberValueUserDeposited: userTVL.mainCurrencyAmount,
        numberValueTotalDeposited: totalTVL.mainCurrencyAmount,
        managementFee: `${yearlyManagementFee * 100}%`,
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

export const selectIsVaultDataStale = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState.isVaultDataStale
)
