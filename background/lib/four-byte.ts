import { fetchJson } from "@ethersproject/web"
import { Interface } from "@ethersproject/abi"
import { HexString } from "../types"
import logger from "./logger"

export type FourByteSignature = {
  id: string
  createdAt: string
  functionSignature: string
  functionSelector: string
}

/**
 * Calculate a function selector from an ABI fragment.
 *
 * @param functionSignature an ABI fragment used to get the function selector,
 *        in the form `"function(uint256,uint256)"`
 */
export function calculateFunctionSelector(functionSignature: string): string {
  const abi = [`function ${functionSignature}`]
  const iface = new Interface(abi)
  return iface.getSighash(Object.keys(iface.functions)[0])
}

/**
 * Look up and retrieve a human-readable function signature from 4byte.directory.
 *
 * Learn more at https://www.4byte.directory/docs/
 *
 * @param selector the hex function selector found in EVM transactions
 */
export async function lookupFunctionSelector(
  selector: HexString
): Promise<FourByteSignature | null> {
  if (selector.length >= 10 && selector.match(/^0x[0-9a-fA-f]{8}/)) {
    try {
      const first4 = selector.slice(0, 10).toLowerCase()
      const results = await fetchJson(
        `https://www.4byte.directory/api/v1/signatures/?ordering=created_at&hex_signature=${first4}`
      )
      if (
        "count" in results &&
        results.count !== 0 &&
        "results" in results &&
        results.results.length > 0
      ) {
        const {
          id,
          created_at: createdAt,
          text_signature: functionSignature,
          hex_signature: functionSelector,
        } = results.results[0] as {
          id: string
          created_at: string
          text_signature: string
          hex_signature: string
        }

        if (
          calculateFunctionSelector(functionSignature).toLowerCase() !==
            first4 ||
          first4 !== functionSelector.toLowerCase()
        ) {
          throw new Error(
            "Invalid function selector returned from 4byte.directory. Something is wrong."
          )
        }

        return {
          id,
          createdAt,
          functionSignature,
          functionSelector,
        }
      }
    } catch (err) {
      logger.error(
        "Error looking up function selector from 4byte.directory.",
        err
      )
    }
  }
  return null
}
