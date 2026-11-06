import type { Log } from "@ethersproject/abstract-provider"
import { BigNumber, constants, utils } from "ethers"

import type { HexString } from "../../../../types"
import {
  ERC721_TRANSFER_TOPIC,
  type ERC721TransferLogFields,
} from "../../../erc721"
import { toHexString } from "../../../utils/hex"

export const ACCOUNT: HexString = "0x1111111111111111111111111111111111111111"
export const OTHER: HexString = "0x2222222222222222222222222222222222222222"
export const COLLECTION: HexString =
  "0x4444444444444444444444444444444444444444"
export const OTHER_COLLECTION: HexString =
  "0x5555555555555555555555555555555555555555"
export const ZERO = toHexString(constants.AddressZero)

/** An ethers `Log` whose hex fields are typed as `HexString`. */
export type ERC721TestLog = Omit<
  Log,
  "address" | "data" | "topics" | "transactionHash"
> &
  ERC721TransferLogFields & { data: HexString }

const padded = (value: string) => toHexString(utils.hexZeroPad(value, 32))

/** An ERC-721 `Transfer` log: four topics, no data. */
export function erc721TransferLog({
  from,
  to,
  tokenId,
  contractAddress = COLLECTION,
  blockNumber = 1,
  logIndex = 0,
  txHash = `0x${blockNumber.toString(16)}${logIndex.toString(16)}`,
}: {
  from: HexString
  to: HexString
  tokenId: bigint
  contractAddress?: HexString
  blockNumber?: number
  logIndex?: number
  txHash?: HexString
}): ERC721TestLog {
  return {
    address: contractAddress,
    data: "0x",
    topics: [
      toHexString(ERC721_TRANSFER_TOPIC),
      padded(from),
      padded(to),
      padded(BigNumber.from(tokenId).toHexString()),
    ],
    transactionHash: txHash,
    logIndex,
    blockNumber,
    blockHash: "0xbbbb",
    transactionIndex: 0,
    removed: false,
  }
}

/** Token 1 minted to the account. */
export const MINT = erc721TransferLog({
  from: ZERO,
  to: ACCOUNT,
  tokenId: 1n,
  blockNumber: 10,
})

/** Token 2 minted to the account, then burnt by it. */
export const MINT_TO_BURN = erc721TransferLog({
  from: ZERO,
  to: ACCOUNT,
  tokenId: 2n,
  blockNumber: 11,
})
export const BURN = erc721TransferLog({
  from: ACCOUNT,
  to: ZERO,
  tokenId: 2n,
  blockNumber: 20,
})

/** Token 3 sent to the account, then sent on. */
export const TRANSFER_IN = erc721TransferLog({
  from: OTHER,
  to: ACCOUNT,
  tokenId: 3n,
  blockNumber: 12,
})
export const TRANSFER_OUT = erc721TransferLog({
  from: ACCOUNT,
  to: OTHER,
  tokenId: 3n,
  blockNumber: 21,
})

/** Token 4 sent from the account to itself. */
export const SELF_TRANSFER = erc721TransferLog({
  from: ACCOUNT,
  to: ACCOUNT,
  tokenId: 4n,
  blockNumber: 13,
})

/** A second token of the same collection, and one of another collection. */
export const SECOND_TOKEN = erc721TransferLog({
  from: OTHER,
  to: ACCOUNT,
  tokenId: 5n,
  blockNumber: 14,
})
export const OTHER_COLLECTION_TOKEN = erc721TransferLog({
  from: OTHER,
  to: ACCOUNT,
  tokenId: 1n,
  contractAddress: OTHER_COLLECTION,
  blockNumber: 15,
})

export const ALL_LOGS = [
  MINT,
  MINT_TO_BURN,
  BURN,
  TRANSFER_IN,
  TRANSFER_OUT,
  SELF_TRANSFER,
  SECOND_TOKEN,
  OTHER_COLLECTION_TOKEN,
]

/** Tokens the account holds once every log above has happened. */
export const HELD_AFTER_ALL_LOGS = [
  { contractAddress: COLLECTION, tokenId: "1" },
  { contractAddress: COLLECTION, tokenId: "4" },
  { contractAddress: COLLECTION, tokenId: "5" },
  { contractAddress: OTHER_COLLECTION, tokenId: "1" },
]
