import { createSlice, createSelector } from "@reduxjs/toolkit"
import { BigNumber, Signature, utils } from "ethers"
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
  signature: Signature
  nonce: number
  expiry: number
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

export const claimRewards = createBackgroundAsyncThunk(
  "claim/distributorClaim",
  async (_, { getState }): Promise<string> => {
    const state = getState()
    const { claim } = state as { claim: ClaimingState }
    const provider = getProvider()
    const signer = provider.getSigner()
    const account = await signer.getAddress()

    const referralCode = claim.selectedDAO
    const delegate = claim.selectedDelegate

    const { index, balance } = await findIndexAndBalance(account)

    const merkleProof = getProof(index, account, BigNumber.from(balance))

    // the below line is used to verify if a merkleProof is in the merkle tree
    // const validMerkleProof = verifyProof(index, account, balance, merkleProof)

    const distributorContract = await getDistributorContract()

    try {
      if (!claim.selectedDAO && !delegate) {
        const tx = await distributorContract.populateTransaction.claim(
          index,
          account,
          balance,
          merkleProof
        )
        await signer.sendTransaction(tx)
        return account
      }

      if (referralCode && !delegate) {
        const tx = await distributorContract.claimWithCommunityCode(
          index,
          account,
          balance,
          merkleProof,
          referralCode
        )

        await signer.sendTransaction(tx)
        return account
      }
      const { r, s, v } = claim.signature
      const { nonce, expiry } = claim
      const tx = await distributorContract.voteWithFriends(
        index,
        account,
        balance,
        merkleProof,
        referralCode,
        delegate,
        { nonce, expiry, r, s, v }
      )
      await signer.sendTransaction(tx)
      return account
    } catch {
      return Promise.reject()
    }
  }
)

const initialState = {
  status: "idle",
  claimed: {},
  distributor: {},
  selectedDAO: null,
  selectedDelegate: null,
  eligibility: null,
  delegates,
  DAOs,
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
  },
  extraReducers: (builder) => {
    builder.addCase(claimRewards.pending, (immerState) => {
      immerState.status = "loading"
    })
    builder.addCase(
      claimRewards.fulfilled,
      (immerState, { payload }: { payload: string }) => {
        immerState.status = "success"
        immerState.claimed[payload] = true
      }
    )
    builder.addCase(claimRewards.rejected, (immerState) => {
      immerState.status = "rejected"
    })
  },
})

export const { chooseDAO, chooseDelegate, setEligibility, saveSignature } =
  claimingSlice.actions

export default claimingSlice.reducer

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
      const TALLY_TOKEN = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" // probably validating contract should be the distributor

      const expiry = timestamp + 12 * HOUR // what should be the expiry?
      const types = {
        Delegation: [
          { name: "delegatee", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
        ],
      }
      const domain = {
        name: "Tally Token",
        chainId: 31337,
        validatingContract: TALLY_TOKEN,
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
