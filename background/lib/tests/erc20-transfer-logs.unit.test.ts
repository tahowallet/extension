import type { Log } from "@ethersproject/abstract-provider"
import { BigNumber, utils } from "ethers"

import { AddressOnNetwork } from "../../accounts"
import { ETHEREUM } from "../../constants"
import type SerialFallbackProvider from "../../services/chain/serial-fallback-provider"
import {
  ERC20_TRANSFER_TOPIC,
  getAssetTransfersViaLogs,
  learntMaxBlockRange,
  MINIMUM_LOG_BLOCK_RANGE,
} from "../erc20-transfer-logs"

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

    const transfers = await getAssetTransfersViaLogs(
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

    const transfers = await getAssetTransfersViaLogs(
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
      ).resolves.toEqual([])

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

    const transfers = await getAssetTransfersViaLogs(
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

    const transfers = await getAssetTransfersViaLogs(
      provider,
      ADDRESS_ON_NETWORK,
      100,
      200,
    )

    expect(transfers.map(({ txHash }) => txHash)).toEqual(["0xgood"])
  })
})
