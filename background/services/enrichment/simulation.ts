import type { EVMNetwork } from "../../networks"
import type ChainService from "../chain"
import type { PartialTransactionRequestWithFrom } from "./types"
import { isSafeExecTransactionCalldata, interpretSafeExecution } from "./safe"
import {
  type SimulationCall,
  type SimulationResult,
  simulateCall,
  toHexQuantity,
  toSimulationResult,
} from "./simulate-v1"

export type { SimulationResult }

/**
 * Run `eth_simulateV1` for a pending signature request. On success, returns
 * the resulting logs in `EVMLog` shape so the standard `annotationsFromLogs`
 * pipeline can produce subannotations; on revert, returns the revert reason
 * when the provider supplies one.
 *
 * A call to a Safe's `execTransaction` is simulated as sent, since it carries
 * the owners' real signatures, and the result is tagged with the Safe so its
 * balance changes can be shown.
 *
 * Returns `undefined` if simulation is unavailable or anything about the
 * response is malformed — the caller is expected to fall back to the existing
 * calldata heuristics in that case.
 */
export default async function simulateSignatureRequest(
  chainService: ChainService,
  network: EVMNetwork,
  transaction: PartialTransactionRequestWithFrom,
): Promise<SimulationResult | undefined> {
  const call: SimulationCall = { from: transaction.from }
  if (typeof transaction.to === "string") {
    call.to = transaction.to
  }
  if (typeof transaction.input === "string" && transaction.input !== "0x") {
    call.input = transaction.input
  }
  if (typeof transaction.value === "bigint") {
    call.value = toHexQuantity(transaction.value)
  }
  // The gas limit is deliberately omitted: it's our own estimate, and a low
  // one would surface as a spurious revert. Gas estimation failures are
  // already reported separately.

  const callResult = await simulateCall(chainService, network, call)
  if (!callResult) return undefined

  return call.to !== undefined && isSafeExecTransactionCalldata(call.input)
    ? interpretSafeExecution(callResult, call.to)
    : toSimulationResult(callResult)
}
