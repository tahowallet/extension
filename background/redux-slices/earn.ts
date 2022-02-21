import { TransactionResponse } from "@ethersproject/abstract-provider"
import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"
import { HOUR } from "../constants"
import { ERC20_ABI } from "../lib/erc20"
import VAULT_ABI from "../lib/vault"
import { EIP712TypedData, HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"
import {
  getContract,
  getProvider,
  getSignerAddress,
} from "./utils/contract-utils"

export type ApprovalTargetAllowance = {
  contractAddress: HexString
  allowance: string
}

export type EarnState = {
  signature: Signature
  approvalTargetAllowances: ApprovalTargetAllowance[]
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

// once testnet contracts are deployed we should replace this
const APPROVAL_TARGET_CONTRACT_ADDRESS =
  "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" // currently: swap router

export const vaultDeposit = createBackgroundAsyncThunk(
  "signing/vaultAndDeposit",
  async (
    {
      vaultContractAddress,
      amount,
    }: {
      tokenContractAddress: HexString
      vaultContractAddress: HexString
      amount: BigInt
    },
    { getState }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()

    const state = getState()
    const { earn } = state as { earn: EarnState }

    const vaultContract = await getContract(vaultContractAddress, VAULT_ABI)

    const depositTransactionData =
      await vaultContract.populateTransaction.depositWithApprovalTarget(
        amount,
        signerAddress,
        signerAddress,
        amount,
        (await provider.getBlock(provider.getBlockNumber())).timestamp +
          3 * HOUR,
        earn.signature.r,
        earn.signature.s,
        earn.signature.v
      )
    signer.sendTransaction(depositTransactionData)
  }
)

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

    const vaultContract = new ethers.Contract(
      vaultContractAddress,
      VAULT_ABI,
      signer
    )
    const signedWithdrawTransaction = await signer.signTransaction(
      await vaultContract.functions["withdraw(uint256)"](amount)
    )

    provider.sendTransaction(signedWithdrawTransaction)
  }
)

export const getRewards = createBackgroundAsyncThunk(
  "earn/getRewards",
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
    saveAllowance: (
      state,
      {
        payload,
      }: { payload: { contractAddress: HexString; allowance: string } }
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

export const { saveSignature, saveAllowance } = earnSlice.actions

export default earnSlice.reducer

export const approveApprovalTarget = createBackgroundAsyncThunk(
  "earn/approveApprovalTarget",
  async (
    tokenContractAddress: HexString,
    { dispatch }
  ): Promise<TransactionResponse | undefined> => {
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
      }
      return tx
    } catch (error) {
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
        const allowance: BigNumber = await assetContract.functions.allowance(
          signerAddress,
          APPROVAL_TARGET_CONTRACT_ADDRESS
        )
        dispatch(
          earnSlice.actions.saveAllowance({
            contractAddress: tokenContractAddress,
            allowance: allowance.toString(),
          })
        )
      } catch (err) {
        return undefined
      }
    }
    return earn.approvalTargetAllowances[knownAllowanceIndex]
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
      amount: BigInt
    },
    { dispatch }
  ) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()
    const chainID = await signer.getChainId()

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
      value: amount.toString(),
      nonce: 0,
      deadline:
        (await provider.getBlock(provider.getBlockNumber())).timestamp +
        3 * HOUR,
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
