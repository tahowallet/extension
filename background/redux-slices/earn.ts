import { TransactionResponse } from "@ethersproject/abstract-provider"
import { createSlice } from "@reduxjs/toolkit"
import { BigNumber, ethers } from "ethers"
import { HOUR } from "../constants"
import { ERC20_ABI } from "../lib/erc20"
import { getEthereumNetwork } from "../lib/utils"
import VAULT_ABI from "../lib/vault"
import { EIP712TypedData, HexString } from "../types"
import { createBackgroundAsyncThunk } from "./utils"
import {
  getContract,
  getProvider,
  getSignerAddress,
} from "./utils/contract-utils"

export type EarnState = {
  signature: {
    r: string
    s: string
    v: number
  }
}

export const initialState: EarnState = {
  signature: {
    r: "",
    s: "",
    v: 0,
  },
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
  "0x208e94d5661a73360d9387d3ca169e5c130090cd"

export const vaultDeposit = createBackgroundAsyncThunk(
  "signing/vaultAndDeposit",
  async ({
    vaultContractAddress,
    amount,
  }: {
    tokenContractAddress: HexString
    vaultContractAddress: HexString
    amount: BigInt
  }) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()

    const vaultContract = await getContract(vaultContractAddress, VAULT_ABI)

    const depositTransactionData =
      await vaultContract.populateTransaction.depositWithApprovalTarget(
        amount,
        signerAddress,
        signerAddress,
        amount,
        (await provider.getBlock(provider.getBlockNumber())).timestamp +
          3 * HOUR

        // r
        // s
        // v
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
      { payload: { r, s, v } }: { payload: { r: string; s: string; v: number } }
    ) => ({
      ...state,
      signature: {
        r,
        s,
        v,
      },
    }),
  },
})

export const { saveSignature } = earnSlice.actions

export default earnSlice.reducer

export const approveApprovalTarget = createBackgroundAsyncThunk(
  "earn/approveApprovalTarget",
  async (
    tokenContractAddress: HexString
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
      if (
        typeof tx.r !== "undefined" &&
        typeof tx.v !== "undefined" &&
        typeof tx.s !== "undefined"
      ) {
        const signature = {
          r: tx.r,
          s: tx.s,
          v: tx.v,
        }
        earnSlice.actions.saveSignature(signature)
      }
      return tx
    } catch (error) {
      return undefined
    }
  }
)

export const permitVaultDeposit = createBackgroundAsyncThunk(
  "earn/permitVaultDeposit",
  async ({
    vaultContractAddress,
    amount,
  }: {
    vaultContractAddress: HexString
    amount: BigInt
  }) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const signerAddress = await getSignerAddress()

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
      chainId: Number(getEthereumNetwork().chainID),
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

    earnSlice.actions.saveSignature({ r, s, v })
  }
)
