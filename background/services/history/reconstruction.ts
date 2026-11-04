import type { AssetTransfer } from "../../assets"
import { isSmartContractFungibleAsset } from "../../assets"
import { sameEVMAddress } from "../../lib/utils"

/** A token holding whose balance is being reconstructed. */
export type ReconstructedToken = {
  holdingKey: string
  /** The token's contract address. */
  contractAddress: string
  decimals: number
}

/**
 * Given an account's token balances at the end of a span of blocks and every
 * token transfer to or from the account within that span, returns the
 * balances at the start of the span, by holding key. Each balance is its
 * balance at the end, less the token's net transfers in between.
 *
 * Transfers of tokens not in \`tokens\` are ignored, as are a token's
 * transfers from the account to itself, which net to nothing. A balance
 * can't go below zero, so if transfers would take one there, some weren't
 * found and zero is returned for it instead.
 *
 * @param balancesAtEnd Each token's balance at the end of the span, in the
 *        token's units, by holding key.
 */
export function balancesBefore({
  account,
  tokens,
  balancesAtEnd,
  transfers,
}: {
  account: string
  tokens: ReconstructedToken[]
  balancesAtEnd: Record<string, number>
  transfers: AssetTransfer[]
}): Record<string, number> {
  const netByContract = new Map<string, bigint>()
  transfers.forEach(({ assetAmount: { asset, amount }, from, to }) => {
    if (!isSmartContractFungibleAsset(asset)) return
    const contract = asset.contractAddress.toLowerCase()
    let net = netByContract.get(contract) ?? 0n
    if (sameEVMAddress(to, account)) net += amount
    if (sameEVMAddress(from, account)) net -= amount
    netByContract.set(contract, net)
  })

  return Object.fromEntries(
    tokens.map(({ holdingKey, contractAddress, decimals }) => {
      const net = netByContract.get(contractAddress.toLowerCase()) ?? 0n
      const atEnd = balancesAtEnd[holdingKey] ?? 0
      return [holdingKey, Math.max(0, atEnd - Number(net) / 10 ** decimals)]
    }),
  )
}
