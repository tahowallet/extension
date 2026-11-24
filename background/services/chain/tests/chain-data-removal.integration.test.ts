import { IDBFactory } from "fake-indexeddb"
import { ETH, ETHEREUM } from "../../../constants"
import type { EVMNetwork } from "../../../networks"
import {
  createAccountBalance,
  createAnyEVMBlock,
  createAnyEVMTransaction,
} from "../../../tests/factories"
import { ChainDatabase, createDB } from "../db"

const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

const FORK_DETAILS = {
  chainName: "Tenderly Mainnet Fork",
  chainID: "73571",
  decimals: 18,
  symbol: "ETH",
  assetName: "Ether",
  rpcUrls: ["https://fork.example.com"],
  blockExplorerURL: "https://forkscan.example.com",
}

describe("ChainDatabase chain data removal", () => {
  let db: ChainDatabase
  let fork: EVMNetwork

  /** Stores a row in every table that keeps data for a chain. */
  const storeRowsFor = async (network: EVMNetwork) => {
    await db.addAccountToTrack({ address: ADDRESS, network })
    await db.recordAccountAssetTransferLookup(
      { address: ADDRESS, network },
      1n,
      2n,
    )
    await db.putNFTLogScanCursors([
      {
        id: `${network.chainID}:${ADDRESS}`,
        chainID: network.chainID,
        account: ADDRESS,
        newestBlock: 2,
        pending: [],
      },
    ])
    await db.addBalance(
      createAccountBalance({
        address: ADDRESS,
        network,
        assetAmount: { asset: ETH, amount: 1n },
      }),
    )
    await db.addOrUpdateTransaction(
      createAnyEVMTransaction({ network }),
      "local",
    )
    await db.addBlock(createAnyEVMBlock({ network }))
  }

  /** Counts the rows that every table keeps for the given chain. */
  const rowsFor = async (chainID: string) => {
    const onChain = <T extends { network: EVMNetwork }>(rows: T[]) =>
      rows.filter(({ network }) => network.chainID === chainID).length
    return {
      tracked: onChain(await db.getAccountsToTrack()),
      cursors:
        (await db.getNFTLogScanCursor(`${chainID}:${ADDRESS}`)) === undefined
          ? 0
          : 1,
      transactions: onChain(await db.getAllTransactions()),
    }
  }

  beforeEach(async () => {
    // oxlint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    db = createDB({ indexedDB })
    await db.initialize()
    fork = await db.addEVMNetwork(FORK_DETAILS)
    await storeRowsFor(fork)
    await storeRowsFor(ETHEREUM)
  })

  afterEach(() => db.close())

  it("finds the chains of a removed network's leftover rows", async () => {
    await db.removeEVMNetwork(fork.chainID)

    expect(await db.getChainIDsWithData()).toEqual(
      new Set([ETHEREUM.chainID, fork.chainID]),
    )
  })

  it("removes a removed network's rows and leaves other chains alone", async () => {
    await db.removeEVMNetwork(fork.chainID)

    // Six tables keep a row each for the fork. removeEVMNetwork already took
    // the tracked account, which leaves five.
    expect(await db.removeChainData(fork.chainID)).toBe(5)

    expect(await rowsFor(fork.chainID)).toEqual({
      tracked: 0,
      cursors: 0,
      transactions: 0,
    })
    expect(await rowsFor(ETHEREUM.chainID)).toEqual({
      tracked: 1,
      cursors: 1,
      transactions: 1,
    })
    expect(await db.getChainIDsWithData()).toEqual(new Set([ETHEREUM.chainID]))
  })

  it("removes rows in more than one batch", async () => {
    await Promise.all(
      Array.from({ length: 450 }, () =>
        db.addBlock(createAnyEVMBlock({ network: fork })),
      ),
    )
    await db.removeEVMNetwork(fork.chainID)

    expect(await db.removeChainData(fork.chainID)).toBe(455)
    expect(await db.getChainIDsWithData()).toEqual(new Set([ETHEREUM.chainID]))
  })
})
