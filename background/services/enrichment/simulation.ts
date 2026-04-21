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

function toHexQuantity(value: bigint | number): HexString {
  return utils.hexValue(BigNumber.from(value))
}

/**
 * Run `eth_simulateV1` for a pending signature request and return the resulting
 * logs in `EVMLog` shape, so the standard `annotationsFromLogs` pipeline can
 * produce subannotations.
 *
 * Returns `undefined` if simulation is unavailable, the simulation reverted, or
 * anything about the response is malformed — the caller is expected to fall
 * back to the existing calldata heuristics in that case.
 */
export default async function simulateSignatureRequestLogs(
  chainService: ChainService,
  network: EVMNetwork,
  transaction: PartialTransactionRequestWithFrom,
): Promise<EVMLog[] | undefined> {
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
  if (typeof transaction.gasLimit === "bigint") {
    call.gas = toHexQuantity(transaction.gasLimit)
  }

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
    // A reverted simulation tells us nothing useful about transfers; defer to
    // the heuristic path so we can still show a best-effort annotation.
    if (callResult.status !== "0x1") return undefined
    if (!callResult.logs) return []

    return callResult.logs.map((log) => ({
      contractAddress: log.address,
      data: log.data,
      topics: log.topics,
    }))
  } catch (err) {
    logger.debug(
      "eth_simulateV1 call failed, falling back to calldata heuristics",
      err,
    )
    return undefined
  }
}
