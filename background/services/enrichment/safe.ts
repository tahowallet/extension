import { BigNumber, utils } from "ethers"
import type { EVMNetwork } from "../../networks"
import type { EIP712TypedData, HexString } from "../../types"
import type ChainService from "../chain"
import { isProbablyEVMAddress, sameEVMAddress } from "../../lib/utils"
import logger from "../../lib/logger"
import {
  type SimulateV1CallResult,
  type SimulationResult,
  simulateCall,
  toSimulationResult,
} from "./simulate-v1"

/**
 * Simulating Safe transactions
 *
 * A pending Safe transaction usually hasn't collected enough owner
 * signatures to execute, so simulating it as-is would only show a signature
 * failure. Following the approach Tenderly uses (and mezo-org/vibes's
 * abi-decoder experiment), we instead simulate `execTransaction` with two
 * adjustments:
 *
 * - The Safe's threshold storage slot is overridden to 1.
 * - The single signature is a "pre-validated" one (`v = 1`) for an owner,
 *   which the Safe accepts when that owner is `msg.sender`, so the call is
 *   sent from that owner.
 *
 * The result is what would happen if the transaction executed now with
 * enough signatures; it does not account for other queued transactions.
 */

const SAFE_INTERFACE = new utils.Interface([
  "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)",
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
  "function nonce() view returns (uint256)",
])

export const SAFE_EXEC_TRANSACTION_SELECTOR =
  SAFE_INTERFACE.getSighash("execTransaction")

/**
 * Storage slots that hold the threshold, most likely first. Safe v1.x keeps
 * it at slot 4 (after singleton, modules, owners, ownerCount); the others
 * cover layouts that shifted by one.
 */
const THRESHOLD_SLOT_CANDIDATES = [4, 3, 5]

/**
 * Safe's terse GSxxx revert codes, for the ones a signer is likely to hit
 * when simulating. See Safe's error codes documentation for the full list.
 */
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  GS010: "Not enough gas to execute the Safe transaction",
  GS011: "The Safe can't pay the gas refund",
  GS012: "The Safe can't pay the gas refund",
  GS013: "A call in this Safe transaction reverts",
  GS025: "The signing owner hasn't approved this transaction",
  GS026: "The signer is not an owner of this Safe",
}

export type SafeTransactionParams = {
  to: HexString
  value: bigint
  data: HexString
  operation: number
  safeTxGas: bigint
  baseGas: bigint
  gasPrice: bigint
  gasToken: HexString
  refundReceiver: HexString
}

export type SafeTypedDataTransaction = {
  safeAddress: HexString
  chainID: string | undefined
  nonce: bigint
  params: SafeTransactionParams
}

function toBigInt(value: unknown): bigint | undefined {
  if (
    typeof value === "bigint" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    try {
      return BigInt(value)
    } catch {
      return undefined
    }
  }
  return undefined
}

/**
 * Recognize an EIP-712 `SafeTx` signing request — how Safe owners propose and
 * confirm transactions off-chain — and extract the transaction it describes.
 */
export function parseSafeTxTypedData(
  typedData: EIP712TypedData,
): SafeTypedDataTransaction | undefined {
  if (typedData.primaryType !== "SafeTx") return undefined

  const { domain, message } = typedData
  const safeAddress = domain.verifyingContract
  if (!safeAddress || !isProbablyEVMAddress(safeAddress)) return undefined

  const { to, data, gasToken, refundReceiver } = message
  const value = toBigInt(message.value)
  const operation = toBigInt(message.operation)
  const safeTxGas = toBigInt(message.safeTxGas)
  // Pre-1.0 Safes call this field `dataGas`.
  const baseGas = toBigInt(message.baseGas ?? message.dataGas)
  const gasPrice = toBigInt(message.gasPrice)
  const nonce = toBigInt(message.nonce)

  if (
    typeof to !== "string" ||
    !isProbablyEVMAddress(to) ||
    typeof gasToken !== "string" ||
    !isProbablyEVMAddress(gasToken) ||
    typeof refundReceiver !== "string" ||
    !isProbablyEVMAddress(refundReceiver) ||
    (data !== undefined &&
      (typeof data !== "string" || !utils.isHexString(data))) ||
    value === undefined ||
    (operation !== 0n && operation !== 1n) ||
    safeTxGas === undefined ||
    baseGas === undefined ||
    gasPrice === undefined ||
    nonce === undefined
  ) {
    return undefined
  }

  return {
    safeAddress,
    chainID:
      domain.chainId === undefined ? undefined : String(Number(domain.chainId)),
    nonce,
    params: {
      to,
      value,
      data: typeof data === "string" ? data : "0x",
      operation: Number(operation),
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
    },
  }
}

/** Whether calldata is a call to a Safe's `execTransaction`. */
export function isSafeExecTransactionCalldata(
  input: string | null | undefined,
): input is HexString {
  if (
    typeof input !== "string" ||
    !input.toLowerCase().startsWith(SAFE_EXEC_TRANSACTION_SELECTOR)
  ) {
    return false
  }
  try {
    SAFE_INTERFACE.decodeFunctionData("execTransaction", input)
    return true
  } catch {
    return false
  }
}

/**
 * The Safe a transaction executes a Safe transaction on, if it calls
 * `execTransaction`; undefined otherwise.
 */
export function getExecutedSafeAddress(transaction: {
  to?: string | null
  input?: string | null
}): HexString | undefined {
  return typeof transaction.to === "string" &&
    isSafeExecTransactionCalldata(transaction.input)
    ? transaction.to
    : undefined
}

/**
 * A "pre-validated" Safe signature: `r` is the owner's address, `s` is zero,
 * and `v` is 1. The Safe accepts it when the owner is `msg.sender`.
 */
export function buildPreValidatedSignature(owner: HexString): HexString {
  return `0x${owner.slice(2).toLowerCase().padStart(64, "0")}${"0".repeat(
    64,
  )}01`
}

export function encodeExecTransaction(
  params: SafeTransactionParams,
  signatures: HexString,
): HexString {
  return SAFE_INTERFACE.encodeFunctionData("execTransaction", [
    params.to,
    params.value,
    params.data,
    params.operation,
    params.safeTxGas,
    params.baseGas,
    params.gasPrice,
    params.gasToken,
    params.refundReceiver,
    signatures,
  ])
}

async function callSafe(
  chainService: ChainService,
  network: EVMNetwork,
  safeAddress: HexString,
  method: "getThreshold" | "getOwners" | "nonce",
): Promise<utils.Result> {
  const result = await chainService.send(
    "eth_call",
    [
      { to: safeAddress, data: SAFE_INTERFACE.encodeFunctionData(method) },
      "latest",
    ],
    network,
  )
  return SAFE_INTERFACE.decodeFunctionResult(method, String(result))
}

/**
 * Find the storage slot holding the Safe's threshold by matching candidate
 * slots against `getThreshold()`. Candidates are checked in order, so a slot
 * that merely holds the same number (e.g. owner count in a 2-of-2) can't win
 * over the expected one.
 */
export async function findThresholdSlot(
  chainService: ChainService,
  network: EVMNetwork,
  safeAddress: HexString,
): Promise<HexString | undefined> {
  const slots = THRESHOLD_SLOT_CANDIDATES.map((slot) =>
    utils.hexZeroPad(utils.hexlify(slot), 32),
  )
  const [[threshold], ...slotValues] = await Promise.all([
    callSafe(chainService, network, safeAddress, "getThreshold"),
    ...slots.map((slot) =>
      chainService.send(
        "eth_getStorageAt",
        [safeAddress, slot, "latest"],
        network,
      ),
    ),
  ])

  const index = slotValues.findIndex(
    (value) =>
      typeof value === "string" &&
      BigNumber.from(value).eq(BigNumber.from(threshold)),
  )
  return index === -1 ? undefined : slots[index]
}

function describeSafeRevert(message: string | undefined): string | undefined {
  const code = message?.match(/GS\d{3}/)?.[0]
  const friendly = code ? SAFE_ERROR_MESSAGES[code] : undefined
  return friendly ? `${friendly} (${code})` : message
}

/**
 * Interpret a simulated `execTransaction` call. With `safeTxGas` or
 * `gasPrice` set, a failing inner call doesn't revert `execTransaction`; it
 * returns `false` (and emits `ExecutionFailure`), so a successful call status
 * alone doesn't mean the Safe transaction succeeded.
 */
export function interpretSafeExecution(
  callResult: SimulateV1CallResult,
  safeAddress: HexString,
): SimulationResult {
  const result = toSimulationResult(callResult)
  if (result.status === "reverted") {
    return {
      ...result,
      revertReason: describeSafeRevert(result.revertReason),
      safeAddress,
    }
  }

  let succeeded = true
  try {
    const [returned] = SAFE_INTERFACE.decodeFunctionResult(
      "execTransaction",
      callResult.returnData ?? "0x",
    )
    succeeded = returned !== false
  } catch {
    // An undecodable return can't tell us otherwise; keep the call's status.
  }

  return succeeded
    ? { ...result, safeAddress }
    : {
        status: "reverted",
        revertReason: SAFE_ERROR_MESSAGES.GS013,
        safeAddress,
      }
}

export type SafeSimulation = {
  simulation: SimulationResult | undefined
  /** The Safe's current nonce, when it could be read. */
  currentNonce: bigint | undefined
}

/**
 * Simulate a pending Safe transaction as if it had enough signatures; see the
 * module comment. `preferredOwner` is used as the simulated executor when it
 * owns the Safe, otherwise the first owner is.
 */
export async function simulatePendingSafeTransaction(
  chainService: ChainService,
  network: EVMNetwork,
  safeAddress: HexString,
  params: SafeTransactionParams,
  preferredOwner: HexString,
): Promise<SafeSimulation> {
  let thresholdSlot: HexString | undefined
  let owners: HexString[]
  let currentNonce: bigint | undefined
  try {
    const [slot, [ownerList], [nonce]] = await Promise.all([
      findThresholdSlot(chainService, network, safeAddress),
      callSafe(chainService, network, safeAddress, "getOwners"),
      callSafe(chainService, network, safeAddress, "nonce"),
    ])
    thresholdSlot = slot
    owners = Array.isArray(ownerList)
      ? ownerList.filter((o): o is HexString => typeof o === "string")
      : []
    currentNonce = BigNumber.from(nonce).toBigInt()
  } catch (err) {
    logger.debug("Couldn't read Safe state for simulation", safeAddress, err)
    return { simulation: undefined, currentNonce: undefined }
  }

  const owner =
    owners.find((candidate) => sameEVMAddress(candidate, preferredOwner)) ??
    owners[0]
  if (thresholdSlot === undefined || owner === undefined) {
    logger.debug("Couldn't find Safe threshold slot or owner", safeAddress)
    return { simulation: undefined, currentNonce }
  }

  const callResult = await simulateCall(
    chainService,
    network,
    {
      from: owner,
      to: safeAddress,
      input: encodeExecTransaction(params, buildPreValidatedSignature(owner)),
    },
    {
      [safeAddress]: {
        stateDiff: { [thresholdSlot]: utils.hexZeroPad("0x01", 32) },
      },
    },
  )

  return {
    simulation: callResult
      ? interpretSafeExecution(callResult, safeAddress)
      : undefined,
    currentNonce,
  }
}
