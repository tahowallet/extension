import type { Activity } from "@tallyho/tally-background/redux-slices/activities"
import { ETHEREUM, OPTIMISM } from "@tallyho/tally-background/constants"
import { activityInvolvesAsset } from "../activities"
import { mergeNetworkActivity } from "../../components/FullTab/FullTabActivityTable"

const activity = (overrides: Partial<Activity>): Activity => ({
  recipient: {},
  sender: {},
  from: "0x0000000000000000000000000000000000000001",
  blockHeight: 100,
  value: "1",
  nonce: 1,
  hash: "0x01",
  blockHash: "0xblock",
  assetSymbol: "ETH",
  ...overrides,
})

const TOKEN = "0x00000000000000000000000000000000000000aa"

describe("activityInvolvesAsset", () => {
  it("matches transfers, approvals and swaps of the asset by symbol", () => {
    for (const type of ["asset-transfer", "asset-approval", "asset-swap"]) {
      expect(
        activityInvolvesAsset(
          activity({ type, assetSymbol: "USDC" }),
          "USDC",
          TOKEN,
        ),
      ).toBe(true)
    }
  })

  it("matches any transaction to the asset's contract", () => {
    expect(
      activityInvolvesAsset(
        activity({ type: "contract-interaction", to: TOKEN }),
        "USDC",
        TOKEN,
      ),
    ).toBe(true)
  })

  it("ignores other assets and unrelated contract interactions", () => {
    expect(
      activityInvolvesAsset(
        activity({ type: "asset-transfer", assetSymbol: "DAI" }),
        "USDC",
        TOKEN,
      ),
    ).toBe(false)
    expect(
      activityInvolvesAsset(
        activity({ type: "contract-interaction", assetSymbol: "ETH" }),
        "ETH",
        undefined,
      ),
    ).toBe(false)
  })
})

describe("mergeNetworkActivity", () => {
  const entry = (overrides: Partial<Activity>, network = ETHEREUM) => ({
    activity: activity(overrides),
    network,
    address: "0x0000000000000000000000000000000000000001",
  })
  const hashes = (lists: ReturnType<typeof entry>[][]) =>
    mergeNetworkActivity(lists).map(({ activity: { hash } }) => hash)

  it("puts pending activity first, then newest across networks", () => {
    const pending = entry({ hash: "0xc", blockHash: null, blockHeight: null })
    const older = entry({ hash: "0xa", blockTimestamp: 1_000 })
    const newer = entry({ hash: "0xb", blockTimestamp: 2_000 }, OPTIMISM)

    expect(hashes([[pending, older], [newer]])).toEqual(["0xc", "0xb", "0xa"])
  })

  it("keeps each network's activity in the order it's given", () => {
    // However a network's list is ordered, the merge doesn't reorder it.
    const list = [
      entry({ hash: "0xa", blockHeight: 10, blockTimestamp: 100 }),
      entry({ hash: "0xb", blockHeight: 30, blockTimestamp: 300 }),
      entry({ hash: "0xc", blockHeight: 20 }),
    ]

    expect(hashes([list])).toEqual(["0xa", "0xb", "0xc"])
  })

  it("interleaves activity without a timestamp beside its neighbors", () => {
    // On Ethereum, 0xb has no timestamp yet but sits above 0xa at time 200.
    const ethereum = [
      entry({ hash: "0xb", blockHeight: 11 }),
      entry({ hash: "0xa", blockHeight: 10, blockTimestamp: 200 }),
    ]
    const optimism = [
      entry({ hash: "0xd", blockHeight: 600, blockTimestamp: 400 }, OPTIMISM),
      entry({ hash: "0xc", blockHeight: 500, blockTimestamp: 150 }, OPTIMISM),
    ]

    expect(hashes([ethereum, optimism])).toEqual(["0xd", "0xb", "0xa", "0xc"])
  })
})
