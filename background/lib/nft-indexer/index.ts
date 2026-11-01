import type { AddressOnNetwork } from "../../accounts"
import { DAY, NETWORK_BY_CHAIN_ID } from "../../constants"
import type {
  ERC721Transfer,
  NFT,
  NFTCollection,
  TransferredNFT,
} from "../../nfts"
import type {
  ERC721ContractInfo,
  ERC721Ownership,
  ERC721TokenMetadata,
  NFTsDatabase,
} from "../../services/nfts/db"
import type { EVMNetwork } from "../../networks"
import { ERC721_INTERFACE, ERC721_INTERFACE_ID } from "../erc721"
import logger from "../logger"
import { normalizeEVMAddress, truncateAddress } from "../utils"
import { batchCalls, CallProvider, CallResult } from "./batch-calls"
import {
  erc721CollectionID,
  heldByLedger,
  ledgerEntryFor,
  ownershipID,
  parseERC721CollectionID,
  TokenKey,
  tokenKeyID,
} from "./ledger"
import {
  fetchTokenMetadataJSON,
  HostBackoff,
  MetadataFetchError,
  metadataHost,
  retryDelay,
  tokenMetadataFromJSON,
} from "./metadata"

/** NFTs per page of a collection. */
export const NFTS_PER_PAGE = 50

/** How long fetched metadata is used before it is fetched again. */
export const METADATA_TTL_MS = 7 * DAY

/** Metadata fetches run at once. */
const METADATA_FETCH_CONCURRENCY = 5

export type NFTIndexerDependencies = {
  db: NFTsDatabase
  providerFor: (network: EVMNetwork) => CallProvider | undefined
  fetch?: typeof fetch
  now?: () => number
}

/** One page of a collection's NFTs and the cursor of the next, if any. */
export type NFTsPage = {
  nfts: NFT[]
  nextPage: string | null
}

function decodeResult<T>(
  functionName: string,
  result: CallResult | undefined,
): T | undefined {
  if (result === undefined || !result.success) {
    return undefined
  }
  try {
    return ERC721_INTERFACE.decodeFunctionResult(
      functionName,
      result.returnData,
    )[0] as T
  } catch (_err) {
    return undefined
  }
}

function compareTokenIds(a: string, b: string): number {
  const difference = BigInt(a) - BigInt(b)
  if (difference === 0n) {
    return 0
  }
  return difference < 0n ? -1 : 1
}

/**
 * Indexes ERC-721 NFTs from the transfers account scans find, with the same
 * surface as the SimpleHash client it replaces.
 *
 * Transfers go into a ledger; a token whose last transfer went to the account
 * is a candidate, and only tokens `ownerOf` confirms are shown. Collection
 * names come from the contract and token metadata from `tokenURI`. Floor
 * prices and rarity stay empty.
 */
export default class NFTIndexer {
  private readonly hostBackoff = new HostBackoff()

  constructor(private readonly dependencies: NFTIndexerDependencies) {}

  private now(): number {
    return this.dependencies.now?.() ?? Date.now()
  }

  /**
   * Adds an account's transfers to the ledger, returning how many it didn't
   * have.
   */
  async recordTransfers(
    account: AddressOnNetwork,
    transfers: ERC721Transfer[],
  ): Promise<number> {
    const added = await this.dependencies.db.addERC721Transfers(
      transfers.map((transfer) => ledgerEntryFor(account, transfer)),
    )
    return added.length
  }

  /**
   * Checks on-chain which of an account's candidate and currently held
   * tokens it owns, and returns those it gained and lost.
   */
  async refreshOwnership({ address, network }: AddressOnNetwork): Promise<{
    gained: TokenKey[]
    lost: TokenKey[]
  }> {
    const { db, providerFor } = this.dependencies
    const provider = providerFor(network)
    const account = normalizeEVMAddress(address)
    const { chainID } = network

    const [entries, ownership] = await Promise.all([
      db.getERC721Transfers(chainID, account),
      db.getERC721Ownership(chainID, account),
    ])
    const known = new Map(ownership.map((row) => [tokenKeyID(row), row]))
    const candidates = new Map(
      [
        ...heldByLedger(entries, account),
        ...ownership.filter(({ owned }) => owned),
      ].map(({ contract, tokenId }) => {
        const token = { chainID, contract, tokenId }
        return [tokenKeyID(token), token]
      }),
    )

    if (provider === undefined || candidates.size === 0) {
      return { gained: [], lost: [] }
    }

    const contracts = await this.contractInfo(
      provider,
      chainID,
      [...candidates.values()].map(({ contract }) => contract),
    )
    const tokens = [...candidates.values()].filter(
      ({ contract }) => contracts.get(contract)?.isERC721 === true,
    )

    const owners = await batchCalls(
      provider,
      tokens.map(({ contract, tokenId }) => ({
        target: contract,
        callData: ERC721_INTERFACE.encodeFunctionData("ownerOf", [tokenId]),
      })),
    )

    const checkedAt = this.now()
    const gained: TokenKey[] = []
    const lost: TokenKey[] = []
    const rows: ERC721Ownership[] = []
    tokens.forEach((token, index) => {
      const result = owners[index]
      // Unanswered; keep what we knew.
      if (result === undefined) {
        return
      }
      // A reverted ownerOf is a burnt or never-minted token.
      const owner = decodeResult<string>("ownerOf", result)
      const owned =
        owner !== undefined && normalizeEVMAddress(owner) === account
      const wasOwned = known.get(tokenKeyID(token))?.owned === true
      if (owned && !wasOwned) {
        gained.push(token)
      } else if (!owned && wasOwned) {
        lost.push(token)
      }
      rows.push({
        id: ownershipID(account, token),
        account,
        ...token,
        owned,
        checkedAt,
      })
    })

    await db.updateERC721Ownership(rows)
    return { gained, lost }
  }

  /**
   * What each contract says about ERC-165 support for ERC-721, its name and
   * its symbol, asked once and kept. Contracts that can't be asked are left
   * out.
   */
  private async contractInfo(
    provider: CallProvider,
    chainID: string,
    contracts: string[],
  ): Promise<Map<string, ERC721ContractInfo>> {
    const { db } = this.dependencies
    const unique = [...new Set(contracts)]
    const stored = await db.getERC721Contracts(
      unique.map((contract) => `${chainID}:${contract}`),
    )
    const info = new Map<string, ERC721ContractInfo>()
    const unknown: string[] = []
    unique.forEach((contract, index) => {
      const row = stored[index]
      if (row === undefined) {
        unknown.push(contract)
      } else {
        info.set(contract, row)
      }
    })
    if (unknown.length === 0) {
      return info
    }

    const results = await batchCalls(
      provider,
      unknown.flatMap((contract) => [
        {
          target: contract,
          callData: ERC721_INTERFACE.encodeFunctionData("supportsInterface", [
            ERC721_INTERFACE_ID,
          ]),
        },
        {
          target: contract,
          callData: ERC721_INTERFACE.encodeFunctionData("name"),
        },
        {
          target: contract,
          callData: ERC721_INTERFACE.encodeFunctionData("symbol"),
        },
      ]),
    )

    const checkedAt = this.now()
    const rows = unknown.flatMap((contract, index) => {
      const [supports, name, symbol] = results.slice(index * 3, index * 3 + 3)
      if (supports === undefined) {
        return []
      }
      const row: ERC721ContractInfo = {
        id: `${chainID}:${contract}`,
        isERC721: decodeResult<boolean>("supportsInterface", supports) === true,
        name: decodeResult<string>("name", name) || undefined,
        symbol: decodeResult<string>("symbol", symbol) || undefined,
        checkedAt,
      }
      info.set(contract, row)
      return [row]
    })
    await db.updateERC721Contracts(rows)
    return info
  }

  /** The tokens an account owns on a chain, by contract. */
  private async ownedTokens(
    chainID: string,
    account: string,
  ): Promise<Map<string, TokenKey[]>> {
    const ownership = await this.dependencies.db.getERC721Ownership(
      chainID,
      account,
    )
    const byContract = new Map<string, TokenKey[]>()
    ownership
      .filter(({ owned }) => owned)
      .sort((a, b) => compareTokenIds(a.tokenId, b.tokenId))
      .forEach(({ contract, tokenId }) => {
        const tokens = byContract.get(contract) ?? []
        tokens.push({ chainID, contract, tokenId })
        byContract.set(contract, tokens)
      })
    return byContract
  }

  /**
   * Token metadata for the given tokens, fetched where it's missing or stale
   * and not backing off. Tokens without metadata are left out.
   */
  private async tokenMetadata(
    network: EVMNetwork,
    tokens: TokenKey[],
  ): Promise<Map<string, ERC721TokenMetadata>> {
    const { db, providerFor } = this.dependencies
    const now = this.now()
    const ids = tokens.map(tokenKeyID)
    const stored = await db.getERC721TokenMetadata(ids)
    const metadata = new Map<string, ERC721TokenMetadata>()
    const due: { token: TokenKey; previous?: ERC721TokenMetadata }[] = []

    tokens.forEach((token, index) => {
      const row = stored[index]
      if (row !== undefined) {
        metadata.set(ids[index], row)
      }
      const isFresh =
        row?.fetchedAt !== undefined && now - row.fetchedAt < METADATA_TTL_MS
      const isWaiting = row?.retryAt !== undefined && row.retryAt > now
      if (!isFresh && !isWaiting) {
        due.push({ token, previous: row })
      }
    })

    const provider = providerFor(network)
    if (due.length === 0 || provider === undefined) {
      return metadata
    }

    const uris = await batchCalls(
      provider,
      due.map(({ token: { contract, tokenId } }) => ({
        target: contract,
        callData: ERC721_INTERFACE.encodeFunctionData("tokenURI", [tokenId]),
      })),
    )

    const updated: ERC721TokenMetadata[] = []
    const fetchOne = async (index: number) => {
      const { token, previous } = due[index]
      const id = tokenKeyID(token)
      const failed = (): ERC721TokenMetadata => {
        const failures = (previous?.failures ?? 0) + 1
        return {
          attributes: [],
          ...previous,
          id,
          failures,
          retryAt: now + retryDelay(failures),
        }
      }

      // Unanswered; try again next time.
      if (uris[index] === undefined) {
        return
      }
      const uri = decodeResult<string>("tokenURI", uris[index])
      if (!uri) {
        updated.push(failed())
        return
      }

      const host = metadataHost(uri)
      if (host !== undefined && this.hostBackoff.isBackingOff(host, now)) {
        return
      }

      try {
        const json = await fetchTokenMetadataJSON(uri, {
          fetch: this.dependencies.fetch,
        })
        if (host !== undefined) {
          this.hostBackoff.recordSuccess(host)
        }
        updated.push({
          ...tokenMetadataFromJSON(json),
          id,
          fetchedAt: now,
          failures: 0,
        })
      } catch (error) {
        const failedHost =
          error instanceof MetadataFetchError ? error.host : host
        if (failedHost !== undefined) {
          this.hostBackoff.recordFailure(failedHost, now)
        }
        logger.debug(
          `chain ${network.chainID}: couldn't load metadata for token ${token.tokenId} of ${token.contract}.`,
          error,
        )
        updated.push(failed())
      }
    }

    // A few at a time, so one slow host doesn't hold the rest.
    let next = 0
    await Promise.all(
      Array.from(
        { length: Math.min(METADATA_FETCH_CONCURRENCY, due.length) },
        async () => {
          while (next < due.length) {
            const index = next
            next += 1
            // oxlint-disable-next-line no-await-in-loop
            await fetchOne(index)
          }
        },
      ),
    )

    await db.updateERC721TokenMetadata(updated)
    updated.forEach((row) => metadata.set(row.id, row))
    return metadata
  }

  private async contractInfoFor(
    chainID: string,
    contracts: string[],
  ): Promise<Map<string, ERC721ContractInfo>> {
    const rows = await this.dependencies.db.getERC721Contracts(
      contracts.map((contract) => `${chainID}:${contract}`),
    )
    return new Map(
      contracts.flatMap((contract, index) => {
        const row = rows[index]
        return row === undefined ? [] : [[contract, row] as const]
      }),
    )
  }

  /** The collection's display name: its name, symbol, or address. */
  private static collectionName(
    contract: string,
    info: ERC721ContractInfo | undefined,
  ): string {
    return info?.name || info?.symbol || truncateAddress(contract)
  }

  /** An account's collections on the given chains, from confirmed tokens. */
  async getNFTCollections(
    address: string,
    chainIDs: string[],
  ): Promise<NFTCollection[]> {
    const account = normalizeEVMAddress(address)
    const collections = await Promise.all(
      chainIDs.map(async (chainID) => {
        const network = NETWORK_BY_CHAIN_ID[chainID]
        if (network === undefined) {
          return []
        }
        const owned = [...(await this.ownedTokens(chainID, account))]
        const info = await this.contractInfoFor(
          chainID,
          owned.map(([contract]) => contract),
        )
        // The first token's image stands for the collection.
        const thumbnails = await this.tokenMetadata(
          network,
          owned.map(([, tokens]) => tokens[0]),
        )

        return owned.map(([contract, tokens]): NFTCollection => {
          return {
            id: erc721CollectionID(chainID, contract),
            name: NFTIndexer.collectionName(contract, info.get(contract)),
            owner: address,
            network,
            hasBadges: false,
            nftCount: tokens.length,
            thumbnailURL: thumbnails.get(tokenKeyID(tokens[0]))?.image,
          }
        })
      }),
    )
    return collections.flat()
  }

  /**
   * A page of an account's NFTs in one of the indexer's collections, read
   * from the local database. `page` is the cursor a previous page returned.
   */
  async getNFTs(
    address: string,
    collectionID: string,
    chainIDs: string[],
    page?: string,
  ): Promise<NFTsPage> {
    const collection = parseERC721CollectionID(collectionID)
    const network =
      collection === undefined
        ? undefined
        : NETWORK_BY_CHAIN_ID[collection.chainID]
    if (
      collection === undefined ||
      network === undefined ||
      !chainIDs.includes(collection.chainID)
    ) {
      return { nfts: [], nextPage: null }
    }

    const { chainID, contract } = collection
    const tokens =
      (await this.ownedTokens(chainID, normalizeEVMAddress(address))).get(
        contract,
      ) ?? []
    const start = Number(page ?? 0)
    const pageTokens = tokens.slice(start, start + NFTS_PER_PAGE)
    const [metadata, info] = await Promise.all([
      this.tokenMetadata(network, pageTokens),
      this.contractInfoFor(chainID, [contract]),
    ])
    const collectionName = NFTIndexer.collectionName(
      contract,
      info.get(contract),
    )

    const nfts = pageTokens.map((token): NFT => {
      const tokenMetadata = metadata.get(tokenKeyID(token))
      return {
        id: tokenKeyID(token),
        tokenId: token.tokenId,
        collectionID,
        name: tokenMetadata?.name || `${collectionName} #${token.tokenId}`,
        description: tokenMetadata?.description ?? "",
        thumbnailURL: tokenMetadata?.image,
        previewURL: tokenMetadata?.image,
        attributes: tokenMetadata?.attributes ?? [],
        rarity: {},
        contract,
        owner: address,
        network,
        isBadge: false,
      }
    })

    const nextStart = start + NFTS_PER_PAGE
    return {
      nfts,
      nextPage: nextStart < tokens.length ? String(nextStart) : null,
    }
  }

  /**
   * Checks ownership on-chain for each account and reports the tokens each
   * gained or lost since the last check.
   */
  async getNFTsTransfers(
    accounts: AddressOnNetwork[],
  ): Promise<TransferredNFT[]> {
    const changes = await Promise.all(
      accounts.map(async (account) => {
        try {
          const { gained, lost } = await this.refreshOwnership(account)
          return [
            ...gained.map((token): TransferredNFT => ({
              id: tokenKeyID(token),
              chainID: token.chainID,
              from: null,
              to: account.address,
              isKnownFromAddress: false,
              isKnownToAddress: true,
              collectionID: erc721CollectionID(token.chainID, token.contract),
            })),
            ...lost.map((token): TransferredNFT => ({
              id: tokenKeyID(token),
              chainID: token.chainID,
              from: account.address,
              to: null,
              isKnownFromAddress: true,
              isKnownToAddress: false,
              collectionID: erc721CollectionID(token.chainID, token.contract),
            })),
          ]
        } catch (error) {
          logger.warn(
            `chain ${account.network.chainID}: couldn't check NFT ownership; trying again later.`,
            { address: account.address },
            error,
          )
          return []
        }
      }),
    )
    return changes.flat()
  }
}
