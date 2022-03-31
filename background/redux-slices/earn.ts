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
  active: boolean
  userDeposited: bigint
  totalDeposited: bigint
  yearnVault: HexString
  asset: AnyAsset & { contractAddress: string; decimals: number }
  pendingRewards: bigint
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
      asset: {
        name: "USDT",
        symbol: "USDT",
        contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
      },
      vaultAddress: "0x6575a8E8Ca0FD1Fb974419AE1f9128cCb1055209",
      yearnVault: "0x7Da96a3891Add058AdA2E826306D812C638D87a7",
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      active: true,
    },
    {
      asset: {
        name: "Wrapped BTC",
        symbol: "WBTC",
        contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        decimals: 8,
      },
      vaultAddress: "0xAAfcDd71F8eb9B6229852fD6B005F0c39394Af06",
      yearnVault: "0xA696a63cc78DfFa1a63E9E50587C197387FF6C7E",
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      active: true,
    },
    {
      asset: {
        name: "ChainLink",
        symbol: "LINK",
        contractAddress: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        decimals: 18,
      },
      vaultAddress: "0x30EEB5c3d3B3FB3aC532c77cD76dd59f78Ff9070",
      yearnVault: "0x671a912C10bba0CFA74Cfc2d6Fba9BA1ed9530B2",
      userDeposited: 0n,
      totalDeposited: 0n,
      pendingRewards: 0n,
      active: false,
    },
  ],
  currentlyDepositing: false,
  currentlyApproving: false,
  depositError: false,
  inputAmount: "",
  depositingProcess: false,
}

const APPROVAL_TARGET_CONTRACT_ADDRESS =
  "0x76465982fD8070FC74c91FD4CFfC7eb56Fc6b03a"

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
    await emitter.emit("earnDeposit", "Asset deposit has failed")
    dispatch(clearSignature())
    dispatch(currentlyDepositing(false))
    dispatch(dispatch(depositError(true)))
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
