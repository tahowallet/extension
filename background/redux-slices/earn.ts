import { TransactionResponse } from "@ethersproject/abstract-provider"
import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"
import { parseUnits } from "ethers/lib/utils"
import Emittery from "emittery"

import { AnyAsset } from "../assets"
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

export type ApprovalTargetAllowance = {
  contractAddress: HexString
  allowance: number
}

export type AvailableVault = {
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

export const emitter = new Emittery<Events>()

export const initialState: EarnState = {
  signature: {
    r: undefined,
    s: undefined,
    v: undefined,
    deadline: undefined,
  },
  approvalTargetAllowances: [],
  availableVaults: [
    {
      vaultAddress: "0xB3eF3AA87B87C606Da4d49F4E643bA0B73c1022D",
      yearnVault: "0xd9788f3931Ede4D5018184E198699dC6d66C1915",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338446,
      poolEndTime: 1650548046,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "Aave Token",
        symbol: "AAVE",
        decimals: 18,
        contractAddress: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
      },
    },
    {
      vaultAddress: "0x0d0A303488BD2775CCd6e958484A1565F1fb521a",
      yearnVault: "0xFBEB78a723b8087fD2ea7Ef1afEc93d35E8Bed42",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338451,
      poolEndTime: 1650548051,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "Uniswap",
        symbol: "UNI",
        decimals: 18,
        contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      },
    },
    {
      vaultAddress: "0x8b7B6006a260d492b8Ce5a4BA23BA5c90cA81351",
      yearnVault: "0x1635b506a88fBF428465Ad65d00e8d6B6E5846C3",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338456,
      poolEndTime: 1650548056,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "Curve CVX-ETH",
        symbol: "crvCVXETH",
        decimals: 18,
        contractAddress: "0x3A283D9c08E8b55966afb64C515f5143cf907611",
      },
    },
    {
      vaultAddress: "0x9c209062d7C2432837b09d00bf0C3E81843CeD31",
      yearnVault: "0x790a60024bC3aea28385b60480f15a0771f26D09",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338461,
      poolEndTime: 1650548061,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "Curve.fi Factory Crypto Pool: YFI/ETH",
        symbol: "YFIETH-f",
        decimals: 18,
        contractAddress: "0x29059568bB40344487d62f7450E78b8E6C74e0e5",
      },
    },
    {
      vaultAddress: "0xb36f1F7f4e0982daa926b93E720e2695732aCbfd",
      yearnVault: "0xF29AE508698bDeF169B89834F76704C3B205aedf",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338467,
      poolEndTime: 1650548067,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "Synthetix Network Token",
        symbol: "SNX",
        decimals: 18,
        contractAddress: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
      },
    },
    {
      vaultAddress: "0xDd7d1CE6A076e83165d162C029dCf31066F444FB",
      yearnVault: "0x6d765CbE5bC922694afE112C140b8878b9FB0390",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338472,
      poolEndTime: 1650548072,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "SushiToken",
        symbol: "SUSHI",
        decimals: 18,
        contractAddress: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
      },
    },
    {
      vaultAddress: "0x8AaA53f416AacbdBe999f3f0D4b9c24Bb957308c",
      yearnVault: "0x67B9F46BCbA2DF84ECd41cC6511ca33507c9f4E9",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338475,
      poolEndTime: 1650548075,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "LooksRare Token",
        symbol: "LOOKS",
        decimals: 18,
        contractAddress: "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
      },
    },
    {
      vaultAddress: "0xCE95BC0D818222d097e39dA3Ce5f7a903a6e346B",
      yearnVault: "0xD4108Bb1185A5c30eA3f4264Fd7783473018Ce17",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338480,
      poolEndTime: 1650548080,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "KEEP Token",
        symbol: "KEEP",
        decimals: 18,
        contractAddress: "0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC",
      },
    },
    {
      vaultAddress: "0x1D93f92BfB93f26558228CFB019f9DCF826e3E3C",
      yearnVault: "0xB364D19c3FF37e0fa4B94bf4cf626729533C1c26",
      duration: 1209600,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338485,
      poolEndTime: 1650548085,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "Curve T-ETH",
        symbol: "crvTETH",
        decimals: 18,
        contractAddress: "0xCb08717451aaE9EF950a2524E33B6DCaBA60147B",
      },
    },
    {
      vaultAddress: "0x173e2998F48b958787850912A4b01A73228cA89C",
      yearnVault: "0x5faF6a2D186448Dfa667c51CB3D695c7A6E52d8E",
      duration: 2592000,
      rewardToken: "0xF2C850284B499e0318aF2Bc4E5328b77e54775F8",
      poolStartTime: 1649338490,
      poolEndTime: 1651930490,
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      asset: {
        name: "Uniswap V2",
        symbol: "UNI-V2",
        decimals: 18,
        contractAddress: "0xAC5115B57709880448d090AC6De8Fc2D6a4fC507",
      },
    },
  ],
  currentlyDepositing: false,
  currentlyApproving: false,
  depositError: false,
  inputAmount: "",
  depositingProcess: false,
}

const APPROVAL_TARGET_CONTRACT_ADDRESS =
  "0x9638990047B8CdF6eE8457d89Ee9Ea8575eC5d9D"

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
    earnedOnVault: (
      state,
      { payload }: { payload: { vault: HexString; amount: bigint } }
    ) => {
      return {
        ...state,
        availableVaults: state.availableVaults.map((availableVault) =>
          availableVault.vaultAddress === payload.vault
            ? { ...availableVault, pendingRewards: payload.amount }
            : availableVault
        ),
      }
    },
    lockedAmounts: (
      state,
      {
        payload,
      }: {
        payload: {
          vault: AvailableVault
          userLockedValue: bigint
          totalTVL: bigint
        }
      }
    ) => {
      return {
        ...state,
        availableVaults: state.availableVaults.map((availableVault) =>
          availableVault.vaultAddress === payload.vault.vaultAddress
            ? {
                ...availableVault,
                userDeposited: payload.userLockedValue,
                totalDeposited: payload.totalTVL,
              }
            : availableVault
        ),
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
  earnedOnVault,
  depositError,
  lockedAmounts,
  inputAmount,
  clearSignature,
  clearInput,
  depositProcess,
} = earnSlice.actions

export default earnSlice.reducer

export const updateLockedValues = createBackgroundAsyncThunk(
  "earn/updateLockedValues",
  async (_, { getState, dispatch }) => {
    const currentState = getState()
    const { earn } = currentState as { earn: EarnState }
    const { availableVaults } = earn
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = signer.getAddress()

    availableVaults.map(async (vault) => {
      const vaultContract = await getContract(vault.vaultAddress, VAULT_ABI)
      const userLockedValue: BigNumber = await vaultContract.balanceOf(account)
      const yearnVaultContract = await getContract(vault.yearnVault, VAULT_ABI)
      const totalTVL: BigNumber = await yearnVaultContract.balanceOf(
        vault.vaultAddress
      )
      dispatch(
        lockedAmounts({
          vault,
          userLockedValue: userLockedValue.toBigInt(),
          totalTVL: totalTVL.toBigInt(),
        })
      )
      return {
        ...vault,
        userDeposited: userLockedValue.toBigInt(),
        totalDeposited: totalTVL.toBigInt(),
      }
    })
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
      dispatch(updateLockedValues())
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
        dispatch(updateLockedValues())
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

export const updateEarnedValues = createBackgroundAsyncThunk(
  "earn/updateEarnedOnDepositedPools",
  async (_, { getState, dispatch }) => {
    const currentState = getState()
    const { earn } = currentState as { earn: EarnState }
    const { availableVaults } = earn
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = signer.getAddress()
    availableVaults.forEach(async (vault) => {
      const vaultContract = await getContract(vault.vaultAddress, VAULT_ABI)
      const earned: BigNumber = await vaultContract.earned(account)
      dispatch(
        earnedOnVault({ vault: vault.vaultAddress, amount: earned.toBigInt() })
      )
    })
  }
)

export const claimVaultRewards = createBackgroundAsyncThunk(
  "earn/clamRewards",
  async (vaultContractAddress: HexString, { dispatch }) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    const vaultContract = new ethers.Contract(
      vaultContractAddress,
      VAULT_ABI,
      signer
    )
    const tx = await vaultContract.functions["getReward()"]()
    const response = signer.sendTransaction(tx)
    await tx.wait(response)
    dispatch(updateEarnedValues())
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
  async (tokenContractAddress: HexString, { dispatch }) => {
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

export const selectEnrichedAvailableVaults = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (state: { assets: AssetsState }): AssetsState => state.assets,
  (earnState: EarnState, assetsState: AssetsState) => {
    // FIXME make this proper main currency
    const mainCurrencySymbol = "USD"
    const vaultsWithMainCurrencyValues = earnState.availableVaults.map(
      (vault) => {
        const assetPricePoint = selectAssetPricePoint(
          assetsState,
          vault.asset.symbol,
          mainCurrencySymbol
        )
        const userTVL = enrichAssetAmountWithMainCurrencyValues(
          { amount: vault.userDeposited, asset: vault.asset },
          assetPricePoint,
          2
        )
        const totalTVL = enrichAssetAmountWithMainCurrencyValues(
          { amount: vault.totalDeposited, asset: vault.asset },
          assetPricePoint,
          2
        )

        return {
          ...vault,
          localValueUserDeposited: userTVL.localizedMainCurrencyAmount,
          localValueTotalDeposited: totalTVL.localizedMainCurrencyAmount,
          numberValueUserDeposited: userTVL.mainCurrencyAmount,
          numberValueTotalDeposited: totalTVL.mainCurrencyAmount,
        }
      }
    )
    return vaultsWithMainCurrencyValues
  }
)
