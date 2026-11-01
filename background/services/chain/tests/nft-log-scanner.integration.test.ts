import type { Filter } from "@ethersproject/abstract-provider"
import { ethers, utils } from "ethers"
import { IDBFactory } from "fake-indexeddb"

import { ETHEREUM } from "../../../constants"
import { storage as flagStorage } from "../../../features"
import { ERC20_TRANSFER_TOPIC } from "../../../lib/erc20-transfer-logs"
import { ERC721_INTERFACE } from "../../../lib/erc721"
import NFTIndexer from "../../../lib/nft-indexer"
import { forgetMulticallDeployments } from "../../../lib/nft-indexer/batch-calls"
import {
  ACCOUNT,
  COLLECTION,
  erc721TransferLog,
  OTHER,
  ZERO,
} from "../../../lib/tests/fixtures/erc721/transfer-logs"
import { normalizeEVMAddress } from "../../../lib/utils"
import { getOrCreateDB, NFTsDatabase } from "../../nfts/db"
import { ChainDatabase, createDB } from "../db"
import NFTLogScanner, {
  NFT_LOG_SCAN_STEP_BLOCKS,
  NFT_LOG_SCAN_STEPS_PER_TICK,
} from "../nft-log-scanner"
import type SerialFallbackProvider from "../serial-fallback-provider"

const account = { address: ACCOUNT, network: ETHEREUM }
const padded = (address: string) => utils.hexZeroPad(address, 32)

/** Token 7, minted to the account; Alchemy and the logs both have it. */
const MINT = erc721TransferLog({
  from: ZERO,
  to: ACCOUNT,
  tokenId: 7n,
  blockNumber: 25_000,
  logIndex: 3,
  txHash: `0x${"a".repeat(64)}`,
})

/** Token 8, sent to the account long ago; only the logs have it. */
const OLD_TRANSFER_IN = erc721TransferLog({
  from: OTHER,
  to: ACCOUNT,
  tokenId: 8n,
  blockNumber: 5_000,
  logIndex: 1,
  txHash: `0x${"b".repeat(64)}`,
})

/** An ERC-20 transfer to the account, which Alchemy reports instead. */
const ERC20_IN = {
  ...OLD_TRANSFER_IN,
  topics: [ERC20_TRANSFER_TOPIC, padded(OTHER), padded(ACCOUNT)],
  data: utils.hexZeroPad("0x64", 32),
  logIndex: 2,
}

/** MINT as `alchemy_getAssetTransfers` describes it. */
const MINT_FROM_ALCHEMY = {
  asset: "FOX",
  hash: MINT.transactionHash,
  blockNum: utils.hexValue(MINT.blockNumber),
  uniqueId: `${MINT.transactionHash}:log:${MINT.logIndex}`,
  category: "erc721",
  from: ZERO,
  to: ACCOUNT.toUpperCase().replace("0X", "0x"),
  erc721TokenId: "0x07",
  tokenId: "0x07",
  rawContract: { address: COLLECTION, decimal: null, value: null },
}

/**
 * A Boar-backed provider: Alchemy's transfers, Transfer logs from a list,
 * and ERC-721 calls without Multicall3.
 */
function boarProvider({ firstBlock }: { firstBlock: number }) {
  const logs = [MINT, OLD_TRANSFER_IN, ERC20_IN]
  const getLogs = jest.fn(async ({ topics = [], fromBlock, toBlock }: Filter) =>
    logs.filter(
      (log) =>
        log.blockNumber >= Number(fromBlock) &&
        log.blockNumber <= Number(toBlock) &&
        topics.every(
          (topic, index) =>
            topic === null ||
            topic === undefined ||
            log.topics[index] === topic,
        ),
    ),
  )
  const send = jest.fn(
    async (
      method: string,
      [params]: [{ order: string; toAddress?: string }],
    ) => {
      if (method !== "alchemy_getAssetTransfers") {
        throw new Error(`unexpected ${method}`)
      }
      if (params.order === "asc") {
        return {
          transfers: [
            {
              ...MINT_FROM_ALCHEMY,
              category: "external",
              blockNum: utils.hexValue(firstBlock),
            },
          ],
        }
      }
      return { transfers: params.toAddress ? [MINT_FROM_ALCHEMY] : [] }
    },
  )
  const call = jest.fn(async ({ data }: { data: string }) => {
    const { name } = ERC721_INTERFACE.parseTransaction({ data })
    switch (name) {
      case "supportsInterface":
        return ERC721_INTERFACE.encodeFunctionResult(name, [true])
      case "ownerOf":
        return ERC721_INTERFACE.encodeFunctionResult(name, [ACCOUNT])
      default:
        throw Object.assign(new Error("execution reverted"), {
          code: ethers.errors.CALL_EXCEPTION,
        })
    }
  })
  const provider = {
    chainID: ETHEREUM.chainID,
    supportsAlchemyMethods: true,
    reachability: "reachable",
    canServeNow: () => true,
    send,
    getLogs,
    call,
    getCode: async () => "0x",
  } as unknown as SerialFallbackProvider
  return { provider, send, getLogs }
}

describe("NFTLogScanner with Boar", () => {
  let chainDB: ChainDatabase
  let nftsDB: NFTsDatabase

  beforeEach(async () => {
    flagStorage.set("SUPPORT_NFT_INDEXER", "true")
    indexedDB = new IDBFactory()
    forgetMulticallDeployments()
    chainDB = createDB({ indexedDB })
    nftsDB = await getOrCreateDB()
  })

  afterEach(() => {
    flagStorage.delete("SUPPORT_NFT_INDEXER")
    chainDB.close()
    nftsDB.close()
  })

  const scannerFor = (
    db: ChainDatabase,
    provider: SerialFallbackProvider,
    head: number,
  ) => {
    const indexer = new NFTIndexer({ db: nftsDB, providerFor: () => provider })
    const recorded: Promise<number>[] = []
    const scanner = new NFTLogScanner({
      db,
      accountsToTrack: async () => [account],
      providerFor: () => provider,
      getBlockHeight: async () => head,
      emitNFTTransfers: (addressNetwork, transfers) => {
        recorded.push(indexer.recordTransfers(addressNetwork, transfers))
      },
    })
    const tick = async () => {
      await scanner.tick()
      await Promise.all(recorded)
    }
    return { indexer, tick }
  }

  it("feeds Alchemy's transfers and the log scan's into one ledger", async () => {
    const { provider, getLogs } = boarProvider({ firstBlock: 5_000 })
    const { indexer, tick } = scannerFor(chainDB, provider, 30_020)

    await tick()

    // Blocks 5,000 to 30,000, newest first, in three steps of two queries.
    expect(getLogs).toHaveBeenCalledTimes(6)
    expect(getLogs.mock.calls.at(-1)?.[0]).toMatchObject({
      fromBlock: 5_000,
      toBlock: 10_000,
    })
    const ledger = await nftsDB.getERC721Transfers(
      ETHEREUM.chainID,
      normalizeEVMAddress(ACCOUNT),
    )
    expect(ledger.map(({ tokenId }) => tokenId).sort()).toEqual(["7", "8"])

    await indexer.getNFTsTransfers([account])
    const [collection] = await indexer.getNFTCollections(ACCOUNT, [
      ETHEREUM.chainID,
    ])
    expect(collection.nftCount).toBe(2)
  })

  it("resumes from its cursor after a restart", async () => {
    const head = 200_020
    const first = boarProvider({ firstBlock: 0 })
    await scannerFor(chainDB, first.provider, head).tick()
    expect(first.getLogs).toHaveBeenCalledTimes(2 * NFT_LOG_SCAN_STEPS_PER_TICK)
    chainDB.close()

    const restartedDB = createDB({ indexedDB })
    const second = boarProvider({ firstBlock: 0 })
    await scannerFor(restartedDB, second.provider, head).tick()
    restartedDB.close()

    // No new start: no first transfer lookup and no priming.
    expect(second.send).not.toHaveBeenCalled()
    expect(second.getLogs.mock.calls[0][0]).toMatchObject({
      toBlock:
        head - 20 - NFT_LOG_SCAN_STEPS_PER_TICK * NFT_LOG_SCAN_STEP_BLOCKS,
    })
    expect(second.getLogs).toHaveBeenCalledTimes(
      2 * NFT_LOG_SCAN_STEPS_PER_TICK,
    )
  })
})
