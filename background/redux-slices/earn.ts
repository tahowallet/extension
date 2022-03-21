import { TransactionResponse } from "@ethersproject/abstract-provider"
import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"
import { AnyAsset } from "../assets"
import { HOUR, doggoTokenDecimalDigits } from "../constants"
import { USE_MAINNET_FORK } from "../features/features"
import { ERC20_ABI, ERC2612_INTERFACE } from "../lib/erc20"
import { fromFixedPointNumber, toFixedPoint } from "../lib/fixed-point"
import { normalizeEVMAddress } from "../lib/utils"
import VAULT_ABI from "../lib/vault"
import { EIP712TypedData, HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"
import {
  getContract,
  getCurrentTimestamp,
  getNonce,
  getProvider,
  getSignerAddress,
} from "./utils/contract-utils"

export type ApprovalTargetAllowance = {
  contractAddress: HexString
  allowance: number
}

export type PendingReward = {
  vaultAddress: HexString
  pendingAmount: number
}

export type DepositedVault = {
  vaultAddress: HexString
  depositedAmount: BigInt
}

export type LockedValue = {
  vaultAddress: HexString
  lockedValue: bigint
  vaultTokenSymbol: string
  asset: AnyAsset
}

export type AvailableVault = {
  name: string
  symbol: string
  contractAddress: HexString
  wantToken: HexString
  active: boolean
}

export type EarnState = {
  signature: Signature
  approvalTargetAllowances: ApprovalTargetAllowance[]
  depositedVaults: DepositedVault[]
  pendingRewards: PendingReward[]
  lockedAmounts: LockedValue[]
  availableVaults: AvailableVault[]
  currentlyDepositing: boolean
  currentlyApproving: boolean
  depositError: boolean
  inputAmount: string
}

export type Signature = {
  r: string | undefined
  s: string | undefined
  v: number | undefined
}

export const initialState: EarnState = {
  signature: {
    r: undefined,
    s: undefined,
    v: undefined,
  },
  approvalTargetAllowances: [],
  depositedVaults: [],
  pendingRewards: [],
  lockedAmounts: [],
  availableVaults: [
    {
      name: "WBTC",
      symbol: "WBTC",
      contractAddress: "0x5D1aB585B7d05d81F07E8Ff33998f2f11647B46e",
      wantToken: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      active: true,
    } as AnyAsset & {
      contractAddress: HexString
      active: boolean
      wantToken: HexString
    },
    {
      name: "USDT",
      symbol: "USDT",
      contractAddress: "0x362Db3b1F85154a537CEf5e2a3D87D56d71DF823",
      active: true,
      wantToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    } as AnyAsset & {
      contractAddress: HexString
      active: boolean
      wantToken: HexString
    },
  ],
  currentlyDepositing: false,
  currentlyApproving: false,
  depositError: false,
  inputAmount: "",
}

export type EIP712DomainType = {
  name?: string
  version?: string
  chainId?: number
  verifyingContract?: HexString
}

export type PermitRequest = {
  account: HexString
  liquidityTokenAddress: HexString
  liquidityAmount: BigNumber
  nonce: BigNumber
  deadline: BigNumber
  spender: HexString
}

export type SignTypedDataRequest = {
  account: string
  typedData: EIP712TypedData
}

const APPROVAL_TARGET_CONTRACT_ADDRESS =
  "0x9a7E392264500e46AAe5277C99d3CD381269cb9B"

const DOGGO_TOKEN_CONTRACT = "0x2eD9D339899CD5f1E4a3B131F467E76549E8Eab0"

export const vaultWithdraw = createBackgroundAsyncThunk(
  "earn/vaultWithdraw",
  async ({
    vaultContractAddress,
    amount,
  }: {
    vaultContractAddress: HexString
    amount: BigNumber
  }) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    const vaultContract = await getContract(vaultContractAddress, VAULT_ABI)

    const signedWithdrawTransaction = await signer.signTransaction(
      await vaultContract.functions["withdraw(uint256)"](amount)
    )

    provider.sendTransaction(signedWithdrawTransaction)
  }
)

export const claimVaultRewards = createBackgroundAsyncThunk(
  "earn/clamRewards",
  async (vaultContractAddress: HexString) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    const vaultContract = new ethers.Contract(
      vaultContractAddress,
      VAULT_ABI,
      signer
    )
    const signedGetRewardsTx = await signer.signTransaction(
      await vaultContract.functions.getReward()
    )

    provider.sendTransaction(signedGetRewardsTx)
  }
)

const earnSlice = createSlice({
  name: "earn",
  initialState,
  reducers: {
    saveSignature: (
      state,
      { payload: { r, s, v } }: { payload: Signature }
    ) => ({
      ...state,
      signature: { r, s, v },
    }),
    clearSignature: (state) => ({
      ...state,
      signature: { r: undefined, s: undefined, v: undefined },
    }),
    currentlyDepositing: (immerState, { payload }: { payload: boolean }) => {
      immerState.currentlyDepositing = payload
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
    deposited: (
      immerState,
      {
        payload,
      }: { payload: { vaultAddress: HexString; depositedAmount: BigInt } }
    ) => {
      immerState.depositedVaults.push(payload)
    },
    earnedAmounts: (state, { payload }: { payload: PendingReward[] }) => {
      return {
        ...state,
        pendingRewards: payload,
      }
    },
    lockedAmounts: (state, { payload }: { payload: LockedValue[] }) => {
      return {
        ...state,
        lockedAmounts: payload,
      }
    },
    withdrawn: (
      state,
      { payload }: { payload: { vault: HexString; depositedAmount: BigInt } }
    ) => {
      return {
        ...state,
        depositedVaults: state.depositedVaults.map((vault) =>
          vault.vaultAddress === payload.vault
            ? { ...vault, depositedAmount: payload.depositedAmount }
            : vault
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
  deposited,
  withdrawn,
  depositError,
  earnedAmounts,
  lockedAmounts,
  inputAmount,
  clearSignature,
} = earnSlice.actions

export default earnSlice.reducer

export const vaultDeposit = createBackgroundAsyncThunk(
  "signing/vaultDeposit",
  async (
    {
      vaultContractAddress,
      amount,
      tokenAddress,
    }: {
      vaultContractAddress: HexString
      amount: string
      tokenAddress: HexString
    },
    { getState, dispatch }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()

    const state = getState()
    const { earn } = state as { earn: EarnState }

    const vaultContract = await getContract(vaultContractAddress, VAULT_ABI)

    const timestamp = await getCurrentTimestamp()

    const TokenContract = await getContract(tokenAddress, ERC2612_INTERFACE)

    const decimals: BigNumber = await TokenContract.decimals()
    // ! cleanup
    const signatureDeadline = BigInt(timestamp) + BigInt(12) * BigInt(HOUR)

    const amountPermitted = await TokenContract.allowance(
      signerAddress,
      APPROVAL_TARGET_CONTRACT_ADDRESS
    )

    const depositTransactionData =
      await vaultContract.populateTransaction.depositWithApprovalTarget(
        toFixedPoint(Number(amount), decimals.toNumber()),
        signerAddress,
        signerAddress,
        amountPermitted,
        signatureDeadline,
        earn.signature.v,
        earn.signature.r,
        earn.signature.s
      )
    if (USE_MAINNET_FORK) {
      depositTransactionData.gasLimit = BigNumber.from(350000) // for mainnet fork only
    }
    const response = signer.sendTransaction(depositTransactionData)
    const result = await response
    const receipt = await result.wait()
    if (receipt.status === 1) {
      dispatch(currentlyDepositing(false))
      dispatch(
        deposited({
          vaultAddress: normalizeEVMAddress(vaultContractAddress),
          depositedAmount: toFixedPoint(Number(amount), decimals.toNumber()),
        })
      )
    }
    dispatch(currentlyDepositing(false))
    dispatch(dispatch(depositError(true)))
  }
)

export const updateEarnedOnDepositedPools = createBackgroundAsyncThunk(
  "earn/updateEarnedOnDepositedPools",
  async (_, { getState, dispatch }) => {
    const currentState = getState()
    const { earn } = currentState as { earn: EarnState }
    const { depositedVaults } = earn
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = signer.getAddress()

    const pendingAmounts = depositedVaults.map(async (vault) => {
      const vaultContract = await getContract(vault.vaultAddress, VAULT_ABI)
      const earned: BigNumber = await vaultContract.earned(account)
      return {
        vaultAddress: vault.vaultAddress,
        pendingAmount: fromFixedPointNumber(
          { amount: earned.toBigInt(), decimals: doggoTokenDecimalDigits },
          0
        ),
      }
    })

    const amounts = await Promise.all(pendingAmounts)
    dispatch(earnedAmounts(amounts))
    return amounts
  }
)

export const updateLockedValues = createBackgroundAsyncThunk(
  "earn/updateLockedValues",
  async (_, { getState, dispatch }) => {
    const currentState = getState()
    const { earn } = currentState as { earn: EarnState }
    const { availableVaults } = earn

    const locked = availableVaults.map(async (vault) => {
      const wantTokenContract = await getContract(vault.wantToken, ERC20_ABI)
      const lockedValue: BigNumber = await wantTokenContract.balanceOf(
        vault.contractAddress
      )
      return {
        vaultAddress: vault.contractAddress,
        vaultTokenSymbol: vault.symbol,
        lockedValue: lockedValue.toBigInt(),
        asset: {
          contractAddress: vault.wantToken,
          name: vault.name,
          symbol: vault.symbol,
        } as AnyAsset,
      }
    })
    // TODO Convert below to be showing $ value rather than BigNumber
    const amounts = await Promise.all(locked)
    dispatch(lockedAmounts(amounts))
    return amounts
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
      const { r, s, v } = tx
      if (
        typeof r !== "undefined" &&
        typeof v !== "undefined" &&
        typeof s !== "undefined"
      ) {
        dispatch(earnSlice.actions.saveSignature({ r, s, v }))
        dispatch(currentlyApproving(false))
      }
      return tx
    } catch (error) {
      dispatch(currentlyApproving(false))
      return undefined
    }
  }
)

export const checkApprovalTargetApproval = createBackgroundAsyncThunk(
  "earn/checkApprovalTargetApproval",
  async (tokenContractAddress: HexString, { getState, dispatch }) => {
    const currentState = getState()
    const { earn } = currentState as { earn: EarnState }
    const assetContract = await getContract(tokenContractAddress, ERC20_ABI)
    const signerAddress = await getSignerAddress()

    const knownAllowanceIndex = earn.approvalTargetAllowances.findIndex(
      (allowance: ApprovalTargetAllowance) =>
        allowance.contractAddress === tokenContractAddress
    )
    if (knownAllowanceIndex === -1) {
      try {
        const allowance: BigNumber = await assetContract.allowance(
          signerAddress,
          APPROVAL_TARGET_CONTRACT_ADDRESS
        )
        const amount = fromFixedPointNumber(
          { amount: allowance.toBigInt(), decimals: 18 },
          2
        )
        dispatch(
          earnSlice.actions.saveAllowance({
            contractAddress: tokenContractAddress,
            allowance: amount,
          })
        )
        return {
          contractAddress: tokenContractAddress,
          allowance: amount,
        } as ApprovalTargetAllowance
      } catch (err) {
        return undefined
      }
    }
    return earn.approvalTargetAllowances.find(
      (_, i) => i === knownAllowanceIndex
    )
  }
)

export const permitVaultDeposit = createBackgroundAsyncThunk(
  "earn/permitVaultDeposit",
  async (
    {
      vaultContractAddress,
      amount,
      tokenAddress,
    }: {
      vaultContractAddress: HexString
      amount: string
      tokenAddress: HexString
    },
    { dispatch }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()
    const chainID = await signer.getChainId()

    const timestamp = await getCurrentTimestamp()
    const signatureDeadline = timestamp + 12 * HOUR

    const TokenContract = await getContract(tokenAddress, ERC2612_INTERFACE)
    const nonceValue = await TokenContract.nonces(signerAddress)

    const decimals: BigNumber = await TokenContract.decimals()

    const types = {
      Message: [
        {
          name: "owner",
          type: "address",
        },
        {
          name: "spender",
          type: "address",
        },
        {
          name: "value",
          type: "uint256",
        },
        {
          name: "nonce",
          type: "uint256",
        },
        {
          name: "deadline",
          type: "uint256",
        },
      ],
    }
    const domain = {
      name: "Spend assets with ApprovalTarget",
      version: "1",
      verifyingContract: vaultContractAddress,
      chainId: chainID,
    }
    const message = {
      owner: signerAddress,
      spender: vaultContractAddress,
      value: toFixedPoint(Number(amount), decimals.toNumber()),
      nonce: nonceValue,
      deadline: signatureDeadline,
    }

    // _signTypedData is the ethers function name, once the official release will be ready _ will be dropped
    // eslint-disable-next-line no-underscore-dangle
    const tx = await signer._signTypedData(domain, types, message)

    const splitSignature = ethers.utils.splitSignature(tx)
    const { r, s, v } = splitSignature

    dispatch(earnSlice.actions.saveSignature({ r, s, v }))
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

// TODO This should include a maincurrency value for each element in the array
export const selectLockedValues = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState.lockedAmounts
)

// TODO This should return a maincurrency value
export const selectTotalLockedValue = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) =>
    earnState.lockedAmounts.reduce((total, vault) => {
      return total + Number(vault.lockedValue)
    }, 0)
)

export const selectIsSignatureAvailable = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => {
    if (
      typeof earnState.signature.r !== "undefined" &&
      typeof earnState.signature.v !== "undefined" &&
      typeof earnState.signature.s !== "undefined"
    ) {
      return true
    }
    return false
  }
)

export const selectEarnInputAmount = createSelector(
  (state: { earn: EarnState }): EarnState => state.earn,
  (earnState: EarnState) => earnState.inputAmount
)
