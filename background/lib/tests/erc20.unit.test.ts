import { BigNumber, utils } from "ethers"

import { parseLogsForERC20Transfers } from "../erc20"
import {
  ACCOUNT,
  COLLECTION,
  OTHER,
  TRANSFER_IN,
} from "./fixtures/erc721/transfer-logs"

const amountData = utils.hexZeroPad(BigNumber.from(7).toHexString(), 32)

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
        senderAddress: utils.getAddress(OTHER),
        recipientAddress: utils.getAddress(ACCOUNT),
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
