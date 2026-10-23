import type { EVMNetwork } from "../../networks"
import type { HexString } from "../../types"
import { wait } from "../../lib/utils"
import type ChainService from "../chain"
import type IndexingService from "../indexing"
import type NameService from "../name"
import {
  type SafeTypedDataTransaction,
  simulatePendingSafeTransaction,
} from "./safe"
import { annotationsFromLogs } from "./transactions"
import type { SafeTransactionSignTypedDataAnnotation } from "./types"
import { getAssetTransfersForAddress } from "./utils"

// Matches the budget the transaction signing path gives enrichment; the
// signing prompt waits on this.
const SAFE_SIMULATION_TIMEOUT_MS = 10_000

async function simulateForAnnotation(
  chainService: ChainService,
  indexingService: IndexingService,
  nameService: NameService,
  network: EVMNetwork,
  safeTx: SafeTypedDataTransaction,
  signer: HexString,
): Promise<
  Omit<SafeTransactionSignTypedDataAnnotation, "type" | "safeAddress">
> {
  const { simulation, currentNonce } = await simulatePendingSafeTransaction(
    chainService,
    network,
    safeTx.safeAddress,
    safeTx.params,
    signer,
  )

  const nonceInfo =
    currentNonce === undefined
      ? {}
      : safeTx.nonce < currentNonce
        ? { nonceAlreadyUsed: true }
        : safeTx.nonce > currentNonce
          ? { queuedBefore: Number(safeTx.nonce - currentNonce) }
          : {}

  if (simulation === undefined) return nonceInfo

  if (simulation.status === "reverted") {
    return {
      ...nonceInfo,
      simulation: {
        status: "reverted",
        revertReason: simulation.revertReason,
        balanceChanges: [],
      },
    }
  }

  const subannotations = await annotationsFromLogs(
    chainService,
    indexingService,
    nameService,
    simulation.logs,
    network,
    2 /* TODO desiredDecimals should be configurable */,
    Date.now(),
    undefined,
    [safeTx.safeAddress],
  )

  return {
    ...nonceInfo,
    simulation: {
      status: "success",
      balanceChanges: getAssetTransfersForAddress(
        subannotations,
        safeTx.safeAddress,
      ),
    },
  }
}

/**
 * Annotate a `SafeTx` signing request, simulating the Safe transaction it
 * describes when it targets the signer's current network.
 */
export default async function annotateSafeTxSignTypedDataRequest(
  chainService: ChainService,
  indexingService: IndexingService,
  nameService: NameService,
  network: EVMNetwork,
  safeTx: SafeTypedDataTransaction,
  signer: HexString,
): Promise<SafeTransactionSignTypedDataAnnotation> {
  const annotation: SafeTransactionSignTypedDataAnnotation = {
    type: "safe-transaction",
    safeAddress: safeTx.safeAddress,
  }

  // Safes before v1.3.0 don't put a chain ID in their domain; assume the
  // signer's network for those.
  if (safeTx.chainID !== undefined && safeTx.chainID !== network.chainID) {
    return annotation
  }

  const simulated = await Promise.race([
    simulateForAnnotation(
      chainService,
      indexingService,
      nameService,
      network,
      safeTx,
      signer,
    ).catch(() => undefined),
    wait(SAFE_SIMULATION_TIMEOUT_MS),
  ])

  return simulated ? { ...annotation, ...simulated } : annotation
}
