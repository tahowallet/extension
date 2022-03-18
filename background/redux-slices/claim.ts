import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, Signature, utils } from "ethers"
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

import { HOUR } from "../constants"
import { USE_MAINNET_FORK } from "../features/features"

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
  referrer: string | null
}

const getDistributorContract = async () => {
  const distributorContractAddress =
    "0x55Ef3968731DdA6125FF1545acB94303052c955D" // VoteWithFriends contract address
  const distributor = await getContract(
    distributorContractAddress,
    DISTRIBUTOR_ABI
  )
  return distributor
}

const initialState: ClaimingState = {
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
  referrer: null,
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
    setReferrer: (immerState, { payload: referrer }: { payload: string }) => {
      immerState.referrer = referrer
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
  setReferrer,
} = claimingSlice.actions

export default claimingSlice.reducer

export const claimRewards = createBackgroundAsyncThunk(
  "claim/distributorClaim",
  async (claimState: ClaimingState, { dispatch }) => {
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = await signer.getAddress()

    const referralCode = claimState.selectedDAO
    const delegate = claimState.selectedDelegate
    const { signature, eligibility } = claimState

    if (!eligibility) {
      return
    }

    dispatch(currentlyClaiming(true))

    const distributorContract = await getDistributorContract()

    const confirmReceipt = async (response: Promise<TransactionResponse>) => {
      const result = await response
      const receipt = await result.wait()
      if (receipt.status === 1) {
        dispatch(currentlyClaiming(false))
        dispatch(claimed(normalizeEVMAddress(account)))
        return
      }
      dispatch(currentlyClaiming(false))
      dispatch(dispatch(claimError(normalizeEVMAddress(account))))
      throw new Error("Could not claim")
    }

    let claimTransaction
    if (claimState.selectedDAO === null && delegate === null) {
      claimTransaction = await distributorContract.populateTransaction.claim(
        eligibility.index,
        account,
        eligibility.amount,
        eligibility.proof
      )
    }

    if (referralCode !== null && delegate === null) {
      claimTransaction =
        await distributorContract.populateTransaction.claimWithCommunityCode(
          eligibility.index,
          account,
          eligibility.amount,
          eligibility.proof,
          referralCode.address
        )
    }
    if (signature && referralCode !== null && delegate !== null) {
      const { r, s, v } = signature
      const { nonce, expiry } = claimState
      claimTransaction =
        await distributorContract.populateTransaction.voteWithFriends(
          BigNumber.from(eligibility.index),
          account,
          BigNumber.from(eligibility.amount),
          eligibility.proof,
          referralCode.address,
          delegate.address,
          { nonce, expiry, r, s, v }
        )
    }
    if (claimTransaction) {
      if (USE_MAINNET_FORK) {
        claimTransaction.gasLimit = BigNumber.from(350000) // for mainnet fork only
      }
      try {
        const response = signer.sendTransaction(claimTransaction)
        await confirmReceipt(response)
      } catch {
        dispatch(currentlyClaiming(false))
        dispatch(dispatch(claimError(normalizeEVMAddress(account))))
      }
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
