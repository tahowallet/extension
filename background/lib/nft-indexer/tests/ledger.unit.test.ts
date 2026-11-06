import { ETHEREUM } from "../../../constants"
import { parseERC721TransferLog } from "../../erc721"
import { normalizeEVMAddress } from "../../utils"
import {
  ACCOUNT,
  ALL_LOGS,
  HELD_AFTER_ALL_LOGS,
  MINT_TO_BURN,
  BURN,
  SELF_TRANSFER,
  TRANSFER_IN,
  TRANSFER_OUT,
  type ERC721TestLog,
} from "../../tests/fixtures/erc721/transfer-logs"
import {
  erc721CollectionID,
  heldByLedger,
  ledgerEntryFor,
  parseERC721CollectionID,
} from "../ledger"
import type { AddressOnNetwork } from "../../../accounts"
import type { HexString } from "../../../types"

const account: AddressOnNetwork = { address: ACCOUNT, network: ETHEREUM }

const entries = (logs: ERC721TestLog[]) =>
  logs.map((log) => {
    const transfer = parseERC721TransferLog(log, ETHEREUM)
    if (transfer === undefined) {
      throw new Error("Unparseable fixture")
    }
    return ledgerEntryFor(account, transfer)
  })

const held = (logs: ERC721TestLog[]) =>
  heldByLedger(entries(logs), ACCOUNT)
    .map(({ contract, tokenId }) => `${contract}:${tokenId}`)
    .sort()

describe("heldByLedger", () => {
  it("holds a token minted to the account", () => {
    expect(held([ALL_LOGS[0]])).toHaveLength(1)
  })

  it("drops a token the account burnt", () => {
    expect(held([MINT_TO_BURN, BURN])).toEqual([])
  })

  it("drops a token sent in and then out", () => {
    expect(held([TRANSFER_IN, TRANSFER_OUT])).toEqual([])
  })

  it("holds a token the account sent itself", () => {
    expect(held([SELF_TRANSFER])).toHaveLength(1)
  })

  it("orders by block, whatever order the scans found transfers in", () => {
    // Historic scans run backwards, so older transfers arrive later.
    expect(held([TRANSFER_OUT, TRANSFER_IN])).toEqual([])
    expect(held([...ALL_LOGS].reverse())).toEqual(held(ALL_LOGS))
  })

  it("tracks several tokens per contract and several contracts", () => {
    expect(held(ALL_LOGS)).toEqual(
      HELD_AFTER_ALL_LOGS.map(
        ({ contractAddress, tokenId }) =>
          `${normalizeEVMAddress(contractAddress)}:${tokenId}`,
      ).sort(),
    )
  })
})

const shouted = (hex: string): HexString => `0x${hex.slice(2).toUpperCase()}`

describe("ledgerEntryFor", () => {
  it("gives a transfer the same ID whichever source found it", () => {
    const [fromLog] = entries([TRANSFER_IN])
    const fromAlchemy = ledgerEntryFor(account, {
      network: ETHEREUM,
      contractAddress: shouted(TRANSFER_IN.address),
      tokenId: fromLog.tokenId,
      from: shouted(fromLog.from),
      to: ACCOUNT,
      txHash: shouted(`${TRANSFER_IN.transactionHash}ab`),
      blockNumber: TRANSFER_IN.blockNumber,
      logIndex: TRANSFER_IN.logIndex,
    })
    const fromLogWithHash = ledgerEntryFor(account, {
      ...parseERC721TransferLog(TRANSFER_IN, ETHEREUM)!,
      txHash: `${TRANSFER_IN.transactionHash}ab`,
    })

    expect(fromAlchemy.id).toBe(fromLogWithHash.id)
  })
})

describe("collection IDs", () => {
  it("round-trips a chain and contract", () => {
    const id = erc721CollectionID("1", TRANSFER_IN.address)
    expect(parseERC721CollectionID(id)).toEqual({
      chainID: "1",
      contract: normalizeEVMAddress(TRANSFER_IN.address),
    })
  })

  it("doesn't claim other collection IDs", () => {
    expect(parseERC721CollectionID("POAP")).toBeUndefined()
    expect(
      parseERC721CollectionID("campaign::mezo-nft-collection"),
    ).toBeUndefined()
  })
})
