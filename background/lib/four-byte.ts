import { fetchJson } from "@ethersproject/web"
import { HexString } from "../types"
import logger from "./logger"

export type FourByteSignature = {
  id: string
  createdAt: string
  functionSignature: string
  functionSelector: string
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
  if (selector.length >= 10) {
    try {
      const results = await fetchJson(
        `https://www.4byte.directory/api/v1/signatures/?ordering=created_at&hex_signature=${selector.slice(
          0,
          10
        )}`
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
