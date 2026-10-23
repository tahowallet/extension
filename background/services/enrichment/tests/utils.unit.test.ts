import { ETHEREUM } from "../../../constants"
import { createSmartContractAsset } from "../../../tests/factories"
import { AssetTransfer, EnrichedAddressOnNetwork } from "../types"
import { getAssetTransfersForAddress, getERC20LogsForAddresses } from "../utils"

const USER = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const OTHER = "0x9eef87f4c08d8934cb2a3309df4dec5635338115"
const THIRD = "0x22f9dcf4647084d6c31b2765f6910cd85c178c18"

const enrichedAddress = (address: string): EnrichedAddressOnNetwork => ({
  address,
  network: ETHEREUM,
  annotation: {
    timestamp: 0,
    hasCode: false,
    balance: {
      address,
      network: ETHEREUM,
      assetAmount: { asset: ETHEREUM.baseAsset, amount: 0n },
      dataSource: "local",
      retrievedAt: 0,
    },
  },
})

const transfer = (
  sender: string,
  recipient: string,
  symbol: string,
  localizedDecimalAmount: string,
): AssetTransfer => ({
  type: "asset-transfer",
  timestamp: 0,
  blockTimestamp: undefined,
  sender: enrichedAddress(sender),
  recipient: enrichedAddress(recipient),
  assetAmount: {
    asset: createSmartContractAsset({ symbol }),
    amount: 1n,
    decimalAmount: 1,
    localizedDecimalAmount,
  },
})

describe("getAssetTransfersForAddress", () => {
  it("tags transfers by direction relative to the address", () => {
    const transfers = getAssetTransfersForAddress(
      [
        transfer(USER, OTHER, "USDC", "100"),
        transfer(OTHER, USER.toUpperCase().replace("0X", "0x"), "DAI", "99"),
      ],
      USER,
    )

    expect(transfers).toEqual([
      expect.objectContaining({
        direction: "out",
        assetSymbol: "USDC",
        localizedDecimalAmount: "100",
        counterparty: { address: OTHER },
      }),
      expect.objectContaining({
        direction: "in",
        assetSymbol: "DAI",
        localizedDecimalAmount: "99",
        counterparty: { address: OTHER },
      }),
    ])
  })

  it("names the counterparty when it has a resolved name", () => {
    const named = transfer(USER, OTHER, "USDC", "5")
    named.recipient.annotation.nameRecord = {
      from: { addressOnNetwork: { address: OTHER, network: ETHEREUM } },
      resolved: {
        nameOnNetwork: { name: "pool.eth", network: ETHEREUM },
        expiresAt: Number.MAX_SAFE_INTEGER,
      },
      system: "ENS",
    }

    expect(getAssetTransfersForAddress([named], USER)[0].counterparty).toEqual({
      address: OTHER,
      name: "pool.eth",
    })
  })

  it("ignores transfers that don't involve the address", () => {
    expect(
      getAssetTransfersForAddress([transfer(OTHER, THIRD, "USDC", "1")], USER),
    ).toEqual([])
  })

  it("handles missing subannotations", () => {
    expect(getAssetTransfersForAddress(undefined, USER)).toEqual([])
  })
})

describe("getERC20LogsForAddresses", () => {
  // Placeholder addresses; the checksummed form mixes case.
  const LOWER = "0xabcdef0123456789abcdef0123456789abcdef01"
  const CHECKSUMMED = "0xABcdEF0123456789aBcdEf0123456789aBCDEF01"
  const log = {
    contractAddress: "0x5555555555555555555555555555555555555555",
    amount: 1n,
    senderAddress: LOWER,
    recipientAddress: OTHER,
  }

  it("matches addresses regardless of case", () => {
    expect(getERC20LogsForAddresses([log], [CHECKSUMMED])).toEqual([log])
  })

  it("leaves out logs that involve none of the addresses", () => {
    expect(getERC20LogsForAddresses([log], [THIRD])).toEqual([])
  })
})
