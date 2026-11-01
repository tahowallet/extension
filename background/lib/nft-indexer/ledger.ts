import type { AddressOnNetwork } from "../../accounts"
import type { ERC721Transfer } from "../../nfts"
import type { ERC721LedgerEntry } from "../../services/nfts/db"
import { normalizeEVMAddress } from "../utils"

/** An ERC-721 token on a chain. */
export type TokenKey = {
  chainID: string
  contract: string
  tokenId: string
}

/** The ID of a collection the indexer serves: one contract on one chain. */
export function erc721CollectionID(chainID: string, contract: string): string {
  return `erc721:${chainID}:${normalizeEVMAddress(contract)}`
}

/** The chain and contract of an indexer collection ID, if it is one. */
export function parseERC721CollectionID(
  collectionID: string,
): { chainID: string; contract: string } | undefined {
  const [kind, chainID, contract] = collectionID.split(":")
  if (kind !== "erc721" || !chainID || !contract) {
    return undefined
  }
  return { chainID, contract }
}

/** A token's ID across chains and contracts. */
export function tokenKeyID({ chainID, contract, tokenId }: TokenKey): string {
  return `${chainID}:${contract}:${tokenId}`
}

/** An account's hold on a token. */
export function ownershipID(account: string, token: TokenKey): string {
  return `${token.chainID}:${account}:${token.contract}:${token.tokenId}`
}

/** The ledger entry for one of an account's transfers. */
export function ledgerEntryFor(
  { address, network }: AddressOnNetwork,
  transfer: ERC721Transfer,
): ERC721LedgerEntry {
  const account = normalizeEVMAddress(address)
  const contract = normalizeEVMAddress(transfer.contractAddress)
  const { chainID } = network
  const { tokenId, txHash, logIndex, blockNumber } = transfer
  return {
    id: `${chainID}:${account}:${contract}:${tokenId}:${txHash}:${logIndex}`,
    chainID,
    account,
    contract,
    tokenId,
    from: normalizeEVMAddress(transfer.from),
    to: normalizeEVMAddress(transfer.to),
    txHash,
    blockNumber,
    logIndex,
  }
}

/**
 * Tokens whose latest transfer in the ledger went to the account. History
 * may be incomplete, so these are candidates to check on-chain.
 */
export function heldByLedger(
  entries: ERC721LedgerEntry[],
  account: string,
): TokenKey[] {
  const latest = new Map<string, ERC721LedgerEntry>()
  entries.forEach((entry) => {
    const key = tokenKeyID(entry)
    const current = latest.get(key)
    if (
      current === undefined ||
      entry.blockNumber > current.blockNumber ||
      (entry.blockNumber === current.blockNumber &&
        entry.logIndex > current.logIndex)
    ) {
      latest.set(key, entry)
    }
  })

  const normalizedAccount = normalizeEVMAddress(account)
  return [...latest.values()]
    .filter(({ to }) => to === normalizedAccount)
    .map(({ chainID, contract, tokenId }) => ({ chainID, contract, tokenId }))
}
