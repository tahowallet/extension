import { ethers } from "ethers"
import _ from "lodash"

import type { HexString } from "../../types"
import logger from "../logger"
import { unsafeHexString } from "../utils/hex"
import { MULTICALL_ABI, MULTICALL_CONTRACT_ADDRESS } from "../multicall"

/** One read-only contract call. */
export type ContractCall = {
  target: HexString
  callData: HexString
}

/**
 * A call's answer. A reverted call has `success` false; a call that couldn't
 * be asked at all is `undefined` in the results.
 */
export type CallResult = {
  success: boolean
  returnData: HexString
}

/** The provider methods batched calls need. */
export type CallProvider = {
  chainID: string
  call(transaction: { to: string; data: string }): Promise<string>
  getCode(address: string): Promise<string>
}

/** Calls per Multicall3 `aggregate3` call. */
export const CALLS_PER_MULTICALL = 100

const MULTICALL_INTERFACE = new ethers.utils.Interface(MULTICALL_ABI)

const multicallDeployedByChain = new Map<string, Promise<boolean>>()

/** Forgets which chains have Multicall3. */
export function forgetMulticallDeployments(): void {
  multicallDeployedByChain.clear()
}

/**
 * Whether Multicall3 is deployed on the provider's chain, asked once per chain
 * with `eth_getCode`. A failed check is asked again next time.
 */
function isMulticallDeployed(provider: CallProvider): Promise<boolean> {
  const known = multicallDeployedByChain.get(provider.chainID)
  if (known !== undefined) {
    return known
  }

  const check = provider.getCode(MULTICALL_CONTRACT_ADDRESS).then(
    (code) => code !== "0x" && code !== "",
    (error) => {
      multicallDeployedByChain.delete(provider.chainID)
      throw error
    },
  )
  multicallDeployedByChain.set(provider.chainID, check)
  return check
}

function isRevert(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === ethers.errors.CALL_EXCEPTION
  )
}

/**
 * Sends each call as its own `eth_call`, which the provider batches into
 * JSON-RPC batches.
 */
async function callOneByOne(
  provider: CallProvider,
  calls: ContractCall[],
): Promise<(CallResult | undefined)[]> {
  return Promise.all(
    calls.map(({ target, callData }) =>
      provider.call({ to: target, data: callData }).then(
        (returnData): CallResult => ({
          success: true,
          returnData: unsafeHexString(returnData),
        }),
        (error): CallResult | undefined =>
          isRevert(error) ? { success: false, returnData: "0x" } : undefined,
      ),
    ),
  )
}

async function callThroughMulticall(
  provider: CallProvider,
  calls: ContractCall[],
): Promise<(CallResult | undefined)[]> {
  const data = MULTICALL_INTERFACE.encodeFunctionData("aggregate3", [
    calls.map(({ target, callData }) => [target, true, callData]),
  ])
  const response = await provider.call({
    to: MULTICALL_CONTRACT_ADDRESS,
    data,
  })
  const [results] = MULTICALL_INTERFACE.decodeFunctionResult(
    "aggregate3",
    response,
  ) as unknown as [{ success: boolean; returnData: HexString }[]]
  return results.map(({ success, returnData }) => ({ success, returnData }))
}

/**
 * Runs read-only calls in as few requests as the chain allows: through
 * Multicall3 where it's deployed, in chunks of {@link CALLS_PER_MULTICALL},
 * and otherwise as separate `eth_call`s. A chunk Multicall3 fails is sent
 * one by one.
 */
export async function batchCalls(
  provider: CallProvider,
  calls: ContractCall[],
): Promise<(CallResult | undefined)[]> {
  if (calls.length === 0) {
    return []
  }

  const useMulticall = await isMulticallDeployed(provider).catch(() => false)
  if (!useMulticall) {
    return callOneByOne(provider, calls)
  }

  const chunks = await Promise.all(
    _.chunk(calls, CALLS_PER_MULTICALL).map((chunk) =>
      callThroughMulticall(provider, chunk).catch((error) => {
        logger.debug(
          `chain ${provider.chainID}: Multicall3 failed a batch of ${chunk.length} calls; sending them one by one.`,
          error,
        )
        return callOneByOne(provider, chunk)
      }),
    ),
  )
  return chunks.flat()
}
