/* eslint-disable max-classes-per-file */
import { JsonRpcProvider, WebSocketProvider } from "@ethersproject/providers"

import logger from "./logger"
import { HexString } from "../types"
import { SmartContractAmount } from "../assets"
import { isValidAlchemyTokenBalanceResponse } from "./validate"
import { AddressOnNetwork } from "../accounts"

export class QuickNodeWebsocketProvider extends WebSocketProvider {}

export class QuickNodeProvider extends JsonRpcProvider {}

// We can't use destructuring because webpack has to replace all instances of
// `process.env` variables in the bundled output
export const ALCHEMY_KEY = process.env.ALCHEMY_KEY // eslint-disable-line prefer-destructuring

export async function getTokenBalances(
  provider: WebSocketProvider | JsonRpcProvider,
  { address, network }: AddressOnNetwork,
  tokens?: HexString[]
): Promise<SmartContractAmount[]> {
  const uniqueTokens = [...new Set(tokens ?? [])]

  const json: unknown = await provider.send("qn_getWalletTokenBalance", {
    wallet: address,
  } as any)

  console.log({ provider, json })

  if (!isValidAlchemyTokenBalanceResponse(json)) {
    logger.warn(
      "QuickNode token balance response didn't validate, did the API change?",
      json,
      isValidAlchemyTokenBalanceResponse.errors
    )
    return []
  }

  // TODO log balances with errors, consider returning an error type
  return (
    json.tokenBalances
      .filter(
        (
          b
        ): b is typeof json["tokenBalances"][0] & {
          tokenBalance: Exclude<
            typeof json["tokenBalances"][0]["tokenBalance"],
            undefined | null
          >
        } =>
          (b.error === null || !("error" in b)) &&
          "tokenBalance" in b &&
          b.tokenBalance !== null
      )
      // A hex value of 0x without any subsequent numbers generally means "no
      // value" (as opposed to 0) in Ethereum implementations, so filter it out
      // as effectively undefined.
      .filter(({ tokenBalance }) => tokenBalance !== "0x")
      .map((tokenBalance) => {
        let balance = tokenBalance.tokenBalance
        if (balance.length > 66) {
          balance = balance.substring(0, 66)
        }
        return {
          smartContract: {
            contractAddress: tokenBalance.contractAddress,
            homeNetwork: network,
          },
          amount: BigInt(balance),
        }
      })
  )
}
