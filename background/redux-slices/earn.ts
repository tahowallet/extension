import { TransactionResponse } from "@ethersproject/abstract-provider"
import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"
import { HOUR } from "../constants"
import { ERC20_ABI } from "../lib/erc20"
import { fromFixedPointNumber } from "../lib/fixed-point"
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
  vault: HexString
  pendingAmount: BigInt
}

export type DepositedVault = {
  vault: HexString
  depositedAmount: BigInt
}

export type EarnState = {
  signature: Signature
  approvalTargetAllowances: ApprovalTargetAllowance[]
  depositedVaults: DepositedVault[]
  pendingRewards: PendingReward[]
  currentlyDepositing: boolean
  currentlyApproving: boolean
  depositError: boolean
}

export type Signature = {
  r: string
  s: string
  v: number
}

export const initialState: EarnState = {
  signature: {
    r: "",
    s: "",
    v: 0,
  },
  approvalTargetAllowances: [],
  depositedVaults: [],
  pendingRewards: [],
  currentlyDepositing: false,
  currentlyApproving: false,
  depositError: false,
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

export const claimRewards = createBackgroundAsyncThunk(
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
    currentlyDepositing: (immerState, { payload }: { payload: boolean }) => {
      immerState.currentlyDepositing = payload
    },
    currentlyApproving: (immerState, { payload }: { payload: boolean }) => {
      immerState.currentlyApproving = payload
    },
    deposited: (
      immerState,
      { payload }: { payload: { vault: HexString; depositedAmount: BigInt } }
    ) => {
      immerState.depositedVaults.push(payload)
    },
    withdrawn: (
      state,
      { payload }: { payload: { vault: HexString; depositedAmount: BigInt } }
    ) => {
      return {
        ...state,
        depositedVaults: state.depositedVaults.map((vault) =>
          vault.vault === payload.vault
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
} = earnSlice.actions

export default earnSlice.reducer

export const vaultDeposit = createBackgroundAsyncThunk(
  "signing/vaultDeposit",
  async (
    {
      vaultContractAddress,
      amount,
    }: {
      tokenContractAddress: HexString
      vaultContractAddress: HexString
      amount: BigInt
    },
    { getState, dispatch }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()

    const state = getState()
    const { earn } = state as { earn: EarnState }

    const vaultContract = await getContract(vaultContractAddress, VAULT_ABI)
    const doggoTokenContract = await getContract(
      DOGGO_TOKEN_CONTRACT,
      ERC20_ABI
    )

    const timestamp = await getCurrentTimestamp()
    const signatureDeadline = timestamp + 12 * HOUR

    const amountPermitted = doggoTokenContract.allowance(
      signerAddress,
      APPROVAL_TARGET_CONTRACT_ADDRESS
    )

    const depositTransactionData =
      await vaultContract.populateTransaction.depositWithApprovalTarget(
        amount,
        signerAddress,
        signerAddress,
        amountPermitted,
        signatureDeadline,
        earn.signature.r,
        earn.signature.s,
        earn.signature.v
      )
    const response = signer.sendTransaction(depositTransactionData)
    const result = await response
    const receipt = await result.wait()
    if (receipt.status === 1) {
      dispatch(currentlyDepositing(false))
      dispatch(
        deposited({
          vault: normalizeEVMAddress(vaultContractAddress),
          depositedAmount: amount,
        })
      )
    }
    dispatch(currentlyDepositing(false))
    dispatch(dispatch(depositError(true)))
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
    }: {
      vaultContractAddress: HexString
      amount: string
    },
    { dispatch }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()
    const chainID = await signer.getChainId()

    const timestamp = await getCurrentTimestamp()
    const signatureDeadline = timestamp + 12 * HOUR

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
          type: "string",
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
      value: amount,
      nonce: getNonce(),
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
