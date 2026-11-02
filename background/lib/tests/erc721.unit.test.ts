import { utils } from "ethers"

import { ETHEREUM } from "../../constants"
import { parseERC721TransferLog } from "../erc721"
import {
  ACCOUNT,
  COLLECTION,
  MINT,
  OTHER,
  TRANSFER_IN,
  ZERO,
} from "./fixtures/erc721/transfer-logs"

describe("parseERC721TransferLog", () => {
  it("reads the sender, recipient and token ID from the topics", () => {
    expect(parseERC721TransferLog(TRANSFER_IN, ETHEREUM)).toEqual({
      network: ETHEREUM,
      contractAddress: COLLECTION,
      tokenId: "3",
      from: utils.getAddress(OTHER),
      to: utils.getAddress(ACCOUNT),
      txHash: TRANSFER_IN.transactionHash,
      blockNumber: 12,
      logIndex: 0,
    })
  })

  it("reads a mint as a transfer from the zero address", () => {
    expect(parseERC721TransferLog(MINT, ETHEREUM)?.from).toBe(ZERO)
  })

  it("rejects three-topic logs", () => {
    expect(
      parseERC721TransferLog(
        { ...TRANSFER_IN, topics: TRANSFER_IN.topics.slice(0, 3) },
        ETHEREUM,
      ),
    ).toBeUndefined()
  })

  it("rejects other events", () => {
    expect(
      parseERC721TransferLog(
        {
          ...TRANSFER_IN,
          topics: [utils.id("Approval()"), ...TRANSFER_IN.topics.slice(1)],
        },
        ETHEREUM,
      ),
    ).toBeUndefined()
  })
})
