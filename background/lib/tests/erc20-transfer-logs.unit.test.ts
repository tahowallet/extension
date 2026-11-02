import type { Log } from "@ethersproject/abstract-provider"
import { BigNumber, utils } from "ethers"

import { AddressOnNetwork } from "../../accounts"
import { ETHEREUM } from "../../constants"
import type SerialFallbackProvider from "../../services/chain/serial-fallback-provider"
import { LogHistoryUnavailableError } from "../../services/chain/rpc/log-query-errors"
import {
  ERC20_TRANSFER_TOPIC,
  getAssetTransfersViaLogs,
  getERC721TransfersViaLogs,
  learntEarliestLogBlock,
  learntMaxBlockRange,
  MINIMUM_LOG_BLOCK_RANGE,
} from "../erc20-transfer-logs"
import {
  BURN,
  erc721TransferLog,
  SELF_TRANSFER,
  TRANSFER_IN,
} from "./fixtures/erc721/transfer-logs"

const ACCOUNT_ADDRESS = "0x1111111111111111111111111111111111111111"
const COUNTERPARTY_ADDRESS = "0x2222222222222222222222222222222222222222"
const TOKEN_ADDRESS = "0x3333333333333333333333333333333333333333"

const ADDRESS_ON_NETWORK: AddressOnNetwork = {
  address: ACCOUNT_ADDRESS,
  network: ETHEREUM,
}

const paddedAddress = (address: string) => utils.hexZeroPad(address, 32)

const transferLog = ({
  from = COUNTERPARTY_ADDRESS,
  to = ACCOUNT_ADDRESS,
  amount = 1_000n,
  contractAddress = TOKEN_ADDRESS,
  txHash = "0xaaaa",
  logIndex = 0,
}: {
  from?: string
  to?: string
  amount?: bigint
  contractAddress?: string
  txHash?: string
  logIndex?: number
} = {}): Log => ({
  address: contractAddress,
  data: utils.hexZeroPad(BigNumber.from(amount).toHexString(), 32),
  topics: [ERC20_TRANSFER_TOPIC, paddedAddress(from), paddedAddress(to)],
  transactionHash: txHash,
  logIndex,
  blockNumber: 1,
  blockHash: "0xbbbb",
  transactionIndex: 0,
  removed: false,
})

const stubProvider = () => {
  const getLogs = jest.fn()

  return {
    getLogs,
    provider: { getLogs } as unknown as SerialFallbackProvider,
  }
}

describe("getAssetTransfersViaLogs", () => {
  it("issues an incoming and an outgoing query with the correct topics", async () => {
    const { getLogs, provider } = stubProvider()
    getLogs.mockResolvedValue([])

    await getAssetTransfersViaLogs(provider, ADDRESS_ON_NETWORK, 100, 200)

    expect(getLogs).toHaveBeenCalledTimes(2)
    expect(getLogs).toHaveBeenNthCalledWith(1, {
      topics: [ERC20_TRANSFER_TOPIC, null, paddedAddress(ACCOUNT_ADDRESS)],
      fromBlock: 100,
      toBlock: 200,
    })
    expect(getLogs).toHaveBeenNthCalledWith(2, {
      topics: [ERC20_TRANSFER_TOPIC, paddedAddress(ACCOUNT_ADDRESS)],
      fromBlock: 100,
      toBlock: 200,
    })
  })

  it("issues only the incoming query when incomingOnly is set", async () => {
    const { getLogs, provider } = stubProvider()
    getLogs.mockResolvedValue([])

    await getAssetTransfersViaLogs(provider, ADDRESS_ON_NETWORK, 100, 200, true)

    expect(getLogs).toHaveBeenCalledTimes(1)
    expect(getLogs).toHaveBeenCalledWith({
      topics: [ERC20_TRANSFER_TOPIC, null, paddedAddress(ACCOUNT_ADDRESS)],
      fromBlock: 100,
      toBlock: 200,
    })
  })

  it("produces the same AssetTransfer shape as the Boar helper does", async () => {
    const { getLogs, provider } = stubProvider()
    getLogs.mockResolvedValueOnce([
      transferLog({ amount: 12_345n, txHash: "0xdeadbeef" }),
    ])
    getLogs.mockResolvedValueOnce([])

    const { assetTransfers: transfers } = await getAssetTransfersViaLogs(
      provider,
      ADDRESS_ON_NETWORK,
      100,
      200,
    )

    expect(transfers as unknown).toEqual([
      {
        network: ETHEREUM,
        assetAmount: {
          asset: {
            contractAddress: TOKEN_ADDRESS,
            decimals: 0,
            name: "",
            symbol: "",
            homeNetwork: ETHEREUM,
          },
          amount: 12_345n,
        },
        txHash: "0xdeadbeef",
        to: utils.getAddress(ACCOUNT_ADDRESS),
        from: utils.getAddress(COUNTERPARTY_ADDRESS),
        dataSource: "local",
      },
    ])
  })

  it("splits the block range and merges results when a wide query fails", async () => {
    const { getLogs, provider } = stubProvider()

    const fromBlock = 0
    const toBlock = MINIMUM_LOG_BLOCK_RANGE * 4 - 1
    const midBlock = fromBlock + Math.floor((toBlock - fromBlock) / 2)

    const firstHalfLog = transferLog({ txHash: "0xfirst", logIndex: 1 })
    const secondHalfLog = transferLog({ txHash: "0xsecond", logIndex: 2 })

    getLogs.mockImplementation(
      ({ toBlock: requestedToBlock }: { toBlock: number }) => {
        if (requestedToBlock === toBlock && getLogs.mock.calls.length === 1) {
          return Promise.reject(
            new Error("query returned more than 10000 results"),
          )
        }

        return Promise.resolve(
          requestedToBlock === midBlock ? [firstHalfLog] : [secondHalfLog],
        )
      },
    )

    const { assetTransfers: transfers } = await getAssetTransfersViaLogs(
      provider,
      ADDRESS_ON_NETWORK,
      fromBlock,
      toBlock,
      true,
    )

    // The full range, then each half.
    expect(getLogs).toHaveBeenCalledTimes(3)
    expect(getLogs).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ fromBlock, toBlock: midBlock }),
    )
    expect(getLogs).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ fromBlock: midBlock + 1, toBlock }),
    )
    expect(transfers.map(({ txHash }) => txHash)).toEqual([
      "0xfirst",
      "0xsecond",
    ])
  })

  it("propagates the error when the range is too small to split further", async () => {
    const { getLogs, provider } = stubProvider()
    const error = new Error("block range too wide")
    getLogs.mockRejectedValue(error)

    await expect(
      getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        MINIMUM_LOG_BLOCK_RANGE,
        true,
      ),
    ).rejects.toThrow(error)

    expect(getLogs).toHaveBeenCalledTimes(1)
  })

  it.each([500, 1_000])(
    "completes a full scan pass against a provider capped at %i blocks",
    async (blockCap) => {
      // The caller scans in 5000-block passes; an endpoint that refuses
      // anything wider than its cap has to be reachable by halving, or the
      // identical range fails on every alarm forever.
      const { getLogs, provider } = stubProvider()

      const requestedRanges: number[] = []
      getLogs.mockImplementation(
        ({ fromBlock, toBlock }: { fromBlock: number; toBlock: number }) => {
          const blockCount = toBlock - fromBlock + 1
          requestedRanges.push(blockCount)

          return blockCount > blockCap
            ? Promise.reject(
                new Error(
                  `exceeds max block range of ${blockCap}: ${blockCount}`,
                ),
              )
            : Promise.resolve([])
        },
      )

      await expect(
        getAssetTransfersViaLogs(provider, ADDRESS_ON_NETWORK, 0, 4_999, true),
      ).resolves.toEqual({ assetTransfers: [], nftTransfers: [] })

      // Every range the provider actually served was within its cap, and the
      // whole 5000-block span is covered by them.
      const servedRanges = requestedRanges.filter(
        (blockCount) => blockCount <= blockCap,
      )
      expect(servedRanges.length).toBeGreaterThan(0)
      expect(servedRanges.reduce((sum, count) => sum + count, 0)).toEqual(5_000)
    },
  )

  it("stops halving once a half would fall below the minimum range", async () => {
    const { getLogs, provider } = stubProvider()
    getLogs.mockRejectedValue(new Error("block range too wide"))

    // A range exactly twice the minimum splits once, then each half is too
    // small to split again.
    await expect(
      getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        MINIMUM_LOG_BLOCK_RANGE * 2 - 1,
        true,
      ),
    ).rejects.toThrow("block range too wide")

    // The full range, then the first half; the second half is never reached
    // because the first one's failure propagates.
    expect(getLogs).toHaveBeenCalledTimes(2)
    expect(getLogs).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fromBlock: 0,
        toBlock: MINIMUM_LOG_BLOCK_RANGE - 1,
      }),
    )
  })

  describe("with an endpoint that advertises its widest range", () => {
    const BOAR_LIMIT_ERROR = Object.assign(
      new Error(
        "block range too large; try a block range of at most 10000 blocks",
      ),
      { code: -32602 },
    )
    const cappedProvider = () => {
      const stub = stubProvider()
      const ranges: [number, number][] = []
      stub.getLogs.mockImplementation(
        ({ fromBlock, toBlock }: { fromBlock: number; toBlock: number }) => {
          ranges.push([fromBlock, toBlock])
          return toBlock - fromBlock + 1 > 10_000
            ? Promise.reject(BOAR_LIMIT_ERROR)
            : Promise.resolve([])
        },
      )
      return { ...stub, ranges }
    }

    it("jumps straight to chunks of that size", async () => {
      const { provider, ranges } = cappedProvider()

      await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        24_999,
        true,
      )

      expect(ranges).toEqual([
        [0, 24_999],
        [0, 9_999],
        [10_000, 19_999],
        [20_000, 24_999],
      ])
    })

    it("starts later scans on the same provider at that size", async () => {
      const { provider, ranges } = cappedProvider()
      await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        10_000,
        true,
      )
      ranges.length = 0

      await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        100_000,
        119_999,
        true,
      )

      expect(ranges).toEqual([
        [100_000, 109_999],
        [110_000, 119_999],
      ])
      expect(learntMaxBlockRange(provider)).toBe(10_000)
      expect(learntMaxBlockRange(stubProvider().provider)).toBeUndefined()
    })

    it("halves when the refusal names no limit, then jumps once one does", async () => {
      const { getLogs, provider } = stubProvider()
      const ranges: number[] = []
      getLogs.mockImplementation(
        ({ fromBlock, toBlock }: { fromBlock: number; toBlock: number }) => {
          const count = toBlock - fromBlock + 1
          ranges.push(count)
          if (count > 30_000) {
            return Promise.reject(
              Object.assign(new Error("bad response"), { status: 400 }),
            )
          }
          return count > 10_000
            ? Promise.reject(BOAR_LIMIT_ERROR)
            : Promise.resolve([])
        },
      )

      await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        39_999,
        true,
      )

      // 40000 fails without a limit and halves; the first 20000 learns the
      // limit, and the second half starts at it.
      expect(ranges).toEqual([40_000, 20_000, 10_000, 10_000, 10_000, 10_000])
    })

    it("uses a suggested range for that request only", async () => {
      const { getLogs, provider } = stubProvider()
      getLogs.mockRejectedValueOnce(
        new Error(
          "query returned more than 10000 results. Try with this block range [0x0, 0x3e7].",
        ),
      )
      getLogs.mockResolvedValue([])

      await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        2_999,
        true,
      )

      expect(
        getLogs.mock.calls.map(([{ fromBlock, toBlock }]) => [
          fromBlock,
          toBlock,
        ]),
      ).toEqual([
        [0, 2_999],
        [0, 999],
        [1_000, 1_999],
        [2_000, 2_999],
      ])
      expect(learntMaxBlockRange(provider)).toBeUndefined()
    })
  })

  describe("with an endpoint that has pruned old history", () => {
    const PRUNED_ERROR = Object.assign(
      new Error(
        "pruned history unavailable: requested 0, earliest available 105000000",
      ),
      { code: 4444 },
    )
    const prunedProvider = (error: unknown = PRUNED_ERROR) => {
      const stub = stubProvider()
      const ranges: [number, number][] = []
      stub.getLogs.mockImplementation(
        ({ fromBlock, toBlock }: { fromBlock: number; toBlock: number }) => {
          ranges.push([fromBlock, toBlock])
          return fromBlock < 105_000_000
            ? Promise.reject(error)
            : Promise.resolve([])
        },
      )
      return { ...stub, ranges }
    }

    it("retries from the earliest block it keeps", async () => {
      const { provider, ranges } = prunedProvider()

      await expect(
        getAssetTransfersViaLogs(
          provider,
          ADDRESS_ON_NETWORK,
          0,
          105_002_000,
          true,
        ),
      ).resolves.toEqual({ assetTransfers: [], nftTransfers: [] })

      expect(ranges).toEqual([
        [0, 105_002_000],
        [105_000_000, 105_002_000],
      ])
      expect(learntEarliestLogBlock(provider)).toBe(105_000_000)
    })

    it("doesn't ask below that block again", async () => {
      const { provider, ranges } = prunedProvider()
      await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        105_002_000,
        true,
      )
      ranges.length = 0

      await expect(
        getAssetTransfersViaLogs(provider, ADDRESS_ON_NETWORK, 0, 4_999, true),
      ).rejects.toBeInstanceOf(LogHistoryUnavailableError)
      await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        104_999_000,
        105_001_000,
        true,
      )

      expect(ranges).toEqual([[105_000_000, 105_001_000]])
    })

    it("takes the range asked for as too old when no earliest block is given", async () => {
      const { provider, ranges } = prunedProvider(
        new Error("missing trie node 1a2b"),
      )

      await expect(
        getAssetTransfersViaLogs(provider, ADDRESS_ON_NETWORK, 0, 4_999, true),
      ).rejects.toBeInstanceOf(LogHistoryUnavailableError)
      await expect(
        getAssetTransfersViaLogs(provider, ADDRESS_ON_NETWORK, 0, 4_999, true),
      ).rejects.toBeInstanceOf(LogHistoryUnavailableError)

      expect(ranges).toEqual([[0, 4_999]])
      expect(learntEarliestLogBlock(provider)).toBe(5_000)
    })

    it("fetches the chunks after the earliest block when chunking a range", async () => {
      const { getLogs, provider } = stubProvider()
      getLogs.mockImplementation(
        ({ fromBlock, toBlock }: { fromBlock: number; toBlock: number }) => {
          if (toBlock - fromBlock + 1 > 10_000) {
            return Promise.reject(
              new Error("try a block range of at most 10000 blocks"),
            )
          }
          return fromBlock < 15_000
            ? Promise.reject(new Error("header not found"))
            : Promise.resolve([transferLog({ txHash: `0x${fromBlock}` })])
        },
      )

      const { assetTransfers: transfers } = await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        29_999,
        true,
      )

      expect(transfers.map(({ txHash }) => txHash)).toEqual(["0x20000"])
    })
  })

  it("de-duplicates a self-transfer seen by both queries", async () => {
    const { getLogs, provider } = stubProvider()

    const selfTransferLog = transferLog({
      from: ACCOUNT_ADDRESS,
      to: ACCOUNT_ADDRESS,
      txHash: "0xself",
      logIndex: 7,
    })

    // The same log is returned by both the incoming and the outgoing query, as
    // a real provider would do for a self-transfer.
    getLogs.mockResolvedValueOnce([selfTransferLog])
    getLogs.mockResolvedValueOnce([selfTransferLog])

    const { assetTransfers: transfers } = await getAssetTransfersViaLogs(
      provider,
      ADDRESS_ON_NETWORK,
      100,
      200,
    )

    expect(transfers).toHaveLength(1)
    expect(transfers[0]).toMatchObject({
      txHash: "0xself",
      from: utils.getAddress(ACCOUNT_ADDRESS),
      to: utils.getAddress(ACCOUNT_ADDRESS),
    })
  })

  it("skips logs that cannot be decoded as ERC-20 transfers", async () => {
    const { getLogs, provider } = stubProvider()

    const undecodableLog: Log = {
      ...transferLog({ txHash: "0xbad", logIndex: 3 }),
      // Missing the indexed recipient topic and carrying no amount data.
      topics: [ERC20_TRANSFER_TOPIC],
      data: "0x",
    }

    getLogs.mockResolvedValueOnce([
      undecodableLog,
      transferLog({ txHash: "0xgood", logIndex: 4 }),
    ])
    getLogs.mockResolvedValueOnce([])

    const { assetTransfers: transfers } = await getAssetTransfersViaLogs(
      provider,
      ADDRESS_ON_NETWORK,
      100,
      200,
    )

    expect(transfers.map(({ txHash }) => txHash)).toEqual(["0xgood"])
  })

  describe("with ERC-721 transfers among the logs", () => {
    it("returns four-topic logs as NFT transfers, apart from ERC-20 ones", async () => {
      const { getLogs, provider } = stubProvider()
      getLogs.mockResolvedValueOnce([
        transferLog({ txHash: "0xerc20", logIndex: 1 }),
        TRANSFER_IN,
      ])
      getLogs.mockResolvedValueOnce([BURN])

      const { assetTransfers, nftTransfers } = await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        100,
      )

      expect(assetTransfers.map(({ txHash }) => txHash)).toEqual(["0xerc20"])
      expect(
        nftTransfers.map(({ tokenId, blockNumber }) => [tokenId, blockNumber]),
      ).toEqual([
        ["3", 12],
        ["2", 20],
      ])
      expect(nftTransfers[0].network).toBe(ETHEREUM)
    })

    it("de-duplicates an NFT self-transfer seen by both queries", async () => {
      const { getLogs, provider } = stubProvider()
      getLogs.mockResolvedValueOnce([SELF_TRANSFER])
      getLogs.mockResolvedValueOnce([SELF_TRANSFER])

      const { nftTransfers } = await getAssetTransfersViaLogs(
        provider,
        ADDRESS_ON_NETWORK,
        0,
        100,
      )

      expect(nftTransfers).toHaveLength(1)
    })

    it("drops four-topic logs of other events", async () => {
      const { getLogs, provider } = stubProvider()
      const other = erc721TransferLog({
        from: ACCOUNT_ADDRESS,
        to: COUNTERPARTY_ADDRESS,
        tokenId: 1n,
      })
      other.topics[0] = utils.id("Approval(address,address,uint256)")
      getLogs.mockResolvedValueOnce([other])
      getLogs.mockResolvedValueOnce([])

      await expect(
        getAssetTransfersViaLogs(provider, ADDRESS_ON_NETWORK, 0, 100),
      ).resolves.toEqual({ assetTransfers: [], nftTransfers: [] })
    })
  })
})

describe("getERC721TransfersViaLogs", () => {
  it("returns only ERC-721 transfers, from both directions", async () => {
    const { getLogs, provider } = stubProvider()
    getLogs.mockResolvedValueOnce([
      transferLog({ txHash: "0xerc20", logIndex: 1 }),
      TRANSFER_IN,
      SELF_TRANSFER,
    ])
    getLogs.mockResolvedValueOnce([BURN, SELF_TRANSFER])

    const nftTransfers = await getERC721TransfersViaLogs(
      provider,
      ADDRESS_ON_NETWORK,
      0,
      100,
    )

    expect(getLogs).toHaveBeenCalledTimes(2)
    expect(nftTransfers.map(({ txHash }) => txHash)).toEqual([
      TRANSFER_IN.transactionHash,
      SELF_TRANSFER.transactionHash,
      BURN.transactionHash,
    ])
  })
})
