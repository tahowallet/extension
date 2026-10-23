import { BigNumber, utils } from "ethers"
import { EVMLog, EVMNetwork } from "../../networks"
import { HexString } from "../../types"
import ChainService from "../chain"
import { PartialTransactionRequestWithFrom } from "./types"
import logger from "../../lib/logger"

type SimulateV1Log = {
  address: HexString
  topics: HexString[]
  data: HexString
}

type SimulateV1CallResult = {
  status: HexString
  returnData?: HexString
  gasUsed?: HexString
  logs?: SimulateV1Log[]
  error?: { code: number; message: string; data?: HexString }
}

type SimulateV1BlockResult = {
  calls?: SimulateV1CallResult[]
}

export type SimulationResult =
  | { status: "success"; logs: EVMLog[] }
  | { status: "reverted"; revertReason?: string }

function toHexQuantity(value: bigint | number): HexString {
  return utils.hexValue(BigNumber.from(value))
}

/**
 * Run `eth_simulateV1` for a pending signature request. On success, returns
 * the resulting logs in `EVMLog` shape so the standard `annotationsFromLogs`
 * pipeline can produce subannotations; on revert, returns the revert reason
 * when the provider supplies one.
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
  const provider = chainService.providerForNetwork(network)
  if (!provider) return undefined

  const supported = await provider.supportsEthSimulateV1()
  if (!supported) return undefined

  const call: Record<string, string> = { from: transaction.from }
  if (typeof transaction.to === "string") {
    call.to = transaction.to
  }
  if (typeof transaction.input === "string" && transaction.input !== "0x") {
    call.data = transaction.input
  }
  if (typeof transaction.value === "bigint") {
    call.value = toHexQuantity(transaction.value)
  }
  // The gas limit is deliberately omitted: it's our own estimate, and a low
  // one would surface as a spurious revert. Gas estimation failures are
  // already reported separately.

  try {
    const results = (await chainService.send(
      "eth_simulateV1",
      [
        {
          blockStateCalls: [{ calls: [call] }],
          traceTransfers: true,
          validation: false,
          returnFullTransactions: false,
        },
        "latest",
      ],
      network,
    )) as SimulateV1BlockResult[] | undefined

    const callResult = results?.[0]?.calls?.[0]
    if (!callResult) return undefined
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
  } catch (err) {
    logger.debug(
      "eth_simulateV1 call failed, falling back to calldata heuristics",
      err,
    )
    return undefined
  }
}
