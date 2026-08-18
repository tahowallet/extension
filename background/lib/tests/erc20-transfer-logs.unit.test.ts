import type { Log } from "@ethersproject/abstract-provider"
import { BigNumber, utils } from "ethers"

import { AddressOnNetwork } from "../../accounts"
import { ETHEREUM } from "../../constants"
import type SerialFallbackProvider from "../../services/chain/serial-fallback-provider"
import {
  ERC20_TRANSFER_TOPIC,
  getAssetTransfersViaLogs,
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

    expect(transfers).toEqual([
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
