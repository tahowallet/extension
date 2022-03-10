import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, ethers, Signature, utils } from "ethers"
import { TransactionResponse } from "@ethersproject/abstract-provider"
import { Eligible } from "../services/claim/types"

import { createBackgroundAsyncThunk } from "./utils"
import { normalizeEVMAddress, truncateAddress } from "../lib/utils"

import {
  getContract,
  getCurrentTimestamp,
  getNonce,
  getProvider,
} from "./utils/contract-utils"
import DAOs from "../static/DAOs.json"
import delegates from "../static/delegates.json"
import { HexString } from "../types"
import DISTRIBUTOR_ABI from "./contract-abis/merkle-distributor"

import BalanceTree from "../lib/balance-tree"
import eligibles from "../static/eligibles.json"
import { HOUR } from "../constants"

export interface DAO {
  address: string
  name: string
  avatar: string
}

export interface Delegate {
  address: string
  ensName: string
  applicationLink: string
  avatar?: string
  truncatedAddress?: string
}

interface ClaimingState {
  status: string
  claimed: {
    [address: HexString]: boolean
  }
  distributor: HexString
  delegates: Delegate[]
  eligibility: Eligible | null
  DAOs: DAO[]
  selectedDAO: DAO | null
  selectedDelegate: Delegate | null
  signature: Signature | undefined
  nonce: number | undefined
  expiry: number | undefined
  claimStep: number
  currentlyClaiming: boolean
  claimError: { [address: HexString]: boolean }
}

const newBalanceTree = new BalanceTree(eligibles)

const findIndexAndBalance = (address: string) => {
  const index = eligibles.findIndex(
    (el) => normalizeEVMAddress(address) === normalizeEVMAddress(el.address)
  )
  const balance = eligibles[index].earnings
  return { index, balance }
}

const getDistributorContract = async () => {
  const distributorContractAddress =
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" // Change distributor address here
  const distributor = await getContract(
    distributorContractAddress,
    DISTRIBUTOR_ABI
  )
  return distributor
}

const getProof = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber
) => {
  return newBalanceTree.getProof(index, account, amount)
}

const verifyProof = (
  index: number,
  account: HexString,
  balance: HexString,
  merkleProof: Buffer[]
) => {
  const root = newBalanceTree.getRoot()
  const exists = BalanceTree.verifyProof(
    index,
    account,
    BigNumber.from(balance),
    merkleProof,
    root
  )
  return exists
}

const initialState = {
  status: "idle",
  claimed: {},
  distributor: {},
  selectedDAO: null,
  selectedDelegate: null,
  eligibility: null,
  delegates,
  DAOs,
  claimStep: 1,
  signature: undefined,
  nonce: undefined,
  expiry: undefined,
  currentlyClaiming: false,
  claimError: {},
} as ClaimingState

const claimingSlice = createSlice({
  name: "claim",
  initialState,
  reducers: {
    chooseDAO: (immerState, { payload: DAO }) => {
      immerState.selectedDAO = DAO
    },
    chooseDelegate: (immerState, { payload: delegate }) => {
      immerState.selectedDelegate = delegate
    },
    setEligibility: (immerState, { payload: eligibility }) => {
      immerState.eligibility = eligibility
    },
    advanceClaimStep: (immerState) => {
      immerState.claimStep += 1
    },
    setClaimStep: (immerState, { payload }: { payload: number }) => {
      immerState.claimStep = payload
    },
    resetStep: (immerState) => {
      immerState.claimStep = 1
    },
    claimError: (immerState, { payload }: { payload: HexString }) => {
      immerState.claimError[payload] = true
    },
    currentlyClaiming: (immerState, { payload }: { payload: boolean }) => {
      immerState.currentlyClaiming = payload
    },
    claimed: (immerState, { payload }: { payload: HexString }) => {
      immerState.claimed[payload] = true
      immerState.claimError[payload] = false
    },
    saveSignature: (
      state,
      {
        payload: { signature, nonce, expiry },
      }: { payload: { signature: Signature; nonce: number; expiry: number } }
    ) => ({
      ...state,
      signature,
      nonce,
      expiry,
    }),
    resetSignature: (immerState) => {
      immerState.signature = undefined
      immerState.nonce = undefined
      immerState.expiry = undefined
    },
  },
})

export const {
  chooseDAO,
  chooseDelegate,
  setEligibility,
  saveSignature,
  currentlyClaiming,
  advanceClaimStep,
  setClaimStep,
  claimed,
  resetStep,
  resetSignature,
  claimError,
} = claimingSlice.actions

export default claimingSlice.reducer

export const claimRewards = createBackgroundAsyncThunk(
  "claim/distributorClaim",
  async (_, { getState, dispatch }): Promise<string> => {
    const state = getState()
    const { claim } = state as { claim: ClaimingState }
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = await signer.getAddress()

    const referralCode = claim.selectedDAO
    const delegate = claim.selectedDelegate
    const { signature } = claim

    const { index, balance } = await findIndexAndBalance(account)

    const merkleProof = getProof(index, account, BigNumber.from(balance))

    dispatch(currentlyClaiming(true))

    // the below line is used to verify if a merkleProof is in the merkle tree
    // const validMerkleProof = verifyProof(index, account, balance, merkleProof)

    const distributorContract = await getDistributorContract()

    const confirmReceipt = async (response: Promise<TransactionResponse>) => {
      const result = await response
      const receipt = await result.wait()
      if (receipt.status === 1) {
        dispatch(currentlyClaiming(false))
        dispatch(claimed(normalizeEVMAddress(account)))
        return account
      }
      dispatch(currentlyClaiming(false))
      dispatch(dispatch(claimError(normalizeEVMAddress(account))))
      return null
    }

    try {
      if (claim.selectedDAO === null && delegate === null) {
        const tx = distributorContract.claim(
          index,
          account,
          balance,
          merkleProof
        )
        const response = signer.sendTransaction(tx)
        confirmReceipt(response)
      }

      if (referralCode !== null && delegate === null) {
        const tx = distributorContract.claimWithCommunityCode(
          index,
          account,
          balance,
          merkleProof,
          referralCode.address
        )

        const response = signer.sendTransaction(tx)
        confirmReceipt(response)
      }
      if (signature && referralCode !== null && delegate !== null) {
        const { r, s, v } = signature
        const { nonce, expiry } = claim
        const tx =
          await distributorContract.populateTransaction.voteWithFriends(
            index,
            account,
            balance,
            merkleProof,
            referralCode.address,
            delegate.address,
            { nonce, expiry, r, s, v }
          )
        const response = signer.sendTransaction(tx)
        confirmReceipt(response)
      }
      return ethers.constants.AddressZero
    } catch {
      return Promise.reject()
    }
  }
)

export const signTokenDelegationData = createBackgroundAsyncThunk(
  "claim/signDelegation",
  async (_, { getState, dispatch }) => {
    const provider = getProvider()
    const signer = provider.getSigner()

    const state = getState()
    const { claim } = state as { claim: ClaimingState }

    const delegatee = claim.selectedDelegate?.address

    if (delegatee) {
      const nonce = await getNonce()
      const timestamp = await getCurrentTimestamp()

      const expiry = timestamp + 12 * HOUR
      const types = {
        Delegation: [
          { name: "delegatee", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
        ],
      }
      const domain = {
        name: "Tally Token",
        chainId: 1,
      }
      const message = {
        delegatee,
        nonce,
        expiry,
      }
      // _signTypedData is the ethers function name, once the official release will be ready _ will be dropped
      // eslint-disable-next-line no-underscore-dangle
      const tx = await signer._signTypedData(domain, types, message)

      const signature = utils.splitSignature(tx)

      dispatch(
        claimingSlice.actions.saveSignature({ signature, nonce, expiry })
      )
    }
  }
)

export const selectClaim = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState
)

export const selectIsDelegationSigned = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => typeof claimState.signature !== "undefined"
)

export const selectClaimed = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.claimed
)

export const selectClaimError = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.claimError
)

export const selectCurrentlyClaiming = createSelector(
  (state: { claim: ClaimingState }): ClaimingState => state.claim,
  (claimState: ClaimingState) => claimState.currentlyClaiming
)

export const selectClaimSelections = createSelector(
  selectClaim,
  (claimState: ClaimingState) => {
    return {
      selectedDelegate: {
        ...claimState.selectedDelegate,
        truncatedAddress: truncateAddress(
          claimState?.selectedDelegate?.address ?? ""
        ),
      },
      selectedDAO: claimState.selectedDAO,
    }
  }
)
