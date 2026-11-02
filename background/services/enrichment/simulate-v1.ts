import { BigNumber, utils } from "ethers"
import type { EVMLog, EVMNetwork } from "../../networks"
import type { HexString } from "../../types"
import type ChainService from "../chain"
import logger from "../../lib/logger"

type SimulateV1Log = {
  address: HexString
  topics: HexString[]
  data: HexString
}

export type SimulateV1CallResult = {
  status: HexString
  returnData?: HexString
  gasUsed?: HexString
  logs?: SimulateV1Log[]
  error?: { code: number; message: string; data?: HexString }
}

type SimulateV1BlockResult = {
  calls?: SimulateV1CallResult[]
}

export type SimulationCall = {
  from: HexString
  to?: HexString
  /** Calldata; `input` is the field name the execution-apis spec uses. */
  input?: HexString
  value?: HexString
}

/** Per-account storage overrides, keyed by account address. */
export type StateOverrides = Record<
  HexString,
  { stateDiff: Record<HexString, HexString> }
>

export type SimulationResult =
  | { status: "success"; logs: EVMLog[]; safeAddress?: HexString }
  | { status: "reverted"; revertReason?: string; safeAddress?: HexString }

export function toHexQuantity(value: bigint | number): HexString {
  return utils.hexValue(BigNumber.from(value))
}

/**
 * Run a single call through `eth_simulateV1` and return its raw result.
 *
 * Returns `undefined` if the provider doesn't support simulation, the call
 * errors, or the response is malformed.
 */
export async function simulateCall(
  chainService: ChainService,
  network: EVMNetwork,
  call: SimulationCall,
  stateOverrides?: StateOverrides,
): Promise<SimulateV1CallResult | undefined> {
  const provider = chainService.providerForNetwork(network)
  if (!provider) return undefined

  const supported = await provider.supportsEthSimulateV1()
  if (!supported) return undefined

  try {
    const results = (await chainService.send(
      "eth_simulateV1",
      [
        {
          blockStateCalls: [
            stateOverrides
              ? { stateOverrides, calls: [call] }
              : { calls: [call] },
          ],
          traceTransfers: true,
          validation: false,
          returnFullTransactions: false,
        },
        "latest",
      ],
      network,
    )) as SimulateV1BlockResult[] | undefined

    return results?.[0]?.calls?.[0]
  } catch (err) {
    logger.debug("eth_simulateV1 call failed", err)
    return undefined
  }
}

/** Convert a raw call result into the shape enrichment consumes. */
export function toSimulationResult(
  callResult: SimulateV1CallResult,
): SimulationResult {
  if (callResult.status !== "0x1") {
    return { status: "reverted", revertReason: callResult.error?.message }
  }

  return {
    status: "success",
    logs: (callResult.logs ?? []).map((log) => ({
      contractAddress: log.address,
      data: log.data,
      topics: log.topics,
    })),
  }
}
