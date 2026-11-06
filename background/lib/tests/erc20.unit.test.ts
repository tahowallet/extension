import { BigNumber, ethers, utils } from "ethers"

import logger from "../logger"
import { toHexString } from "../utils/hex"
import { getTokenBalances, parseLogsForERC20Transfers } from "../erc20"
import { createAddressOnNetwork } from "../../tests/factories"
import {
  ACCOUNT,
  COLLECTION,
  OTHER,
  TRANSFER_IN,
} from "./fixtures/erc721/transfer-logs"

const amountData = toHexString(
  utils.hexZeroPad(BigNumber.from(7).toHexString(), 32),
)

describe("parseLogsForERC20Transfers", () => {
  it("parses a three-topic Transfer log", () => {
    expect(
      parseLogsForERC20Transfers([
        {
          contractAddress: COLLECTION,
          data: amountData,
          topics: TRANSFER_IN.topics.slice(0, 3),
        },
      ]),
    ).toEqual([
      {
        contractAddress: COLLECTION,
        amount: 7n,
        senderAddress: toHexString(utils.getAddress(OTHER)),
        recipientAddress: toHexString(utils.getAddress(ACCOUNT)),
      },
    ])
  })

  it("ignores an ERC-721 Transfer log", () => {
    expect(
      parseLogsForERC20Transfers([
        {
          contractAddress: COLLECTION,
          data: TRANSFER_IN.data,
          topics: TRANSFER_IN.topics,
        },
      ]),
    ).toEqual([])
  })

  it("ignores a four-topic Transfer log even when it carries data", () => {
    // Decoding would otherwise read the data as an amount and the token ID
    // topic as nothing.
    expect(
      parseLogsForERC20Transfers([
        {
          contractAddress: COLLECTION,
          data: amountData,
          topics: TRANSFER_IN.topics,
        },
      ]),
    ).toEqual([])
  })
})

describe("getTokenBalances", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("logs each balance lookup at debug level", async () => {
    const info = jest.spyOn(logger, "info").mockImplementation(() => {})
    const debug = jest.spyOn(logger, "debug").mockImplementation(() => {})

    await getTokenBalances(
      createAddressOnNetwork(),
      [],
      new ethers.providers.StaticJsonRpcProvider("http://127.0.0.1:1", 1),
    )

    expect(debug).toHaveBeenCalledWith(
      "Looking up balances for",
      0,
      "tokens in",
      0,
      "batches on chain",
      "1",
    )
    expect(info).not.toHaveBeenCalled()
  })
})
