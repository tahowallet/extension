import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import ethers, { BigNumber } from "ethers"
import { DISTRIBUTOR_ABI } from "../constants/abi"
import balances from "../constants/balances"
import BalanceTree from "../lib/balance-tree"

const newBalanceTree = new BalanceTree(balances)

declare global {
  interface Window {
    ethereum: any
  }
}

interface ContractsState {
  status: string
  claimed: {
    [address: string]: boolean
  }
  contracts: {
    distributor: any
  }
}

const getContract = async (chainId: number, address: string, abi: any[]) => {
  if (chainId) {
    await window.ethereum.enable()
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    return new ethers.Contract(address, abi, signer)
  }
  const provider = new ethers.providers.JsonRpcProvider("some rpc url here")
  return new ethers.Contract(address, abi, provider)
}

const findIndexAndBalance = (address: string) => {
  const index = balances.findIndex((el) => address === el.account)
  const balance = balances[index].amount
  return { index, balance }
}

const getDistributorContract = async (chainId: number, address: string) => {
  const distributor = await getContract(chainId, address, DISTRIBUTOR_ABI)
  return distributor
}

const getProof = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber
) => {
  newBalanceTree.getProof(index, account, amount)
}

const fetchDistributorContract = createAsyncThunk(
  "contracts/fetchDistributorContract",
  async (data: { chainId: number; address: string }) => {
    const { chainId, address } = data
    const distributor = await getContract(chainId, address, DISTRIBUTOR_ABI)
    return distributor
  }
)

const claim = createAsyncThunk(
  "contracts/distributorClaim",
  async (data: {
    chainId: number
    address: string
    account: string
    referralCode?: string
  }) => {
    const { chainId, address, account, referralCode } = data
    const { index, balance } = await findIndexAndBalance(account)
    const proof = getProof(index, account, balance)
    const distributor = await getDistributorContract(chainId, address)
    if (!referralCode) {
      const tx = await distributor.claim(index, account, balance, proof)
      const receipt = await tx.wait()
      return receipt
    }
    const tx = await distributor.claimWithCommunityCode(
      index,
      account,
      balance,
      proof,
      referralCode
    )
    const receipt = await tx.wait()
    return receipt
  }
)

const initialState = {
  status: "idle",
  claimed: {},
  contracts: {
    distributor: {},
  },
} as ContractsState

const contractsSlice = createSlice({
  name: "contracts",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      fetchDistributorContract.fulfilled,
      (immerState, { payload }) => {
        immerState.contracts.distributor = payload
      }
    )
    builder.addCase(claim.pending, (immerState) => {
      immerState.status = "loading"
    })
    builder.addCase(claim.fulfilled, (immerState, { payload }) => {
      const address: any = { payload }
      immerState.status = "success"
      immerState.claimed[address] = true
    })
    builder.addCase(claim.rejected, (immerState) => {
      immerState.status = "rejected"
    })
  },
})

export default contractsSlice.reducer
