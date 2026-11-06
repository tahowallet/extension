import { ETHEREUM } from "../../../constants"
import type { AssetTransfer, SmartContractFungibleAsset } from "../../../assets"
import { balancesBefore } from "../history/reconstruction"

const ACCOUNT = "0x1111111111111111111111111111111111111111"
const OTHER = "0x2222222222222222222222222222222222222222"
const TOKEN = "0x3333333333333333333333333333333333333333"
const OTHER_TOKEN = "0x4444444444444444444444444444444444444444"

const transfer = (
  contractAddress: string,
  amount: bigint,
  from: string,
  to: string,
): AssetTransfer => {
  const asset: SmartContractFungibleAsset = {
    contractAddress,
    decimals: 0,
    name: "",
    symbol: "",
    homeNetwork: ETHEREUM,
  }
  return {
    network: ETHEREUM,
    assetAmount: { asset, amount },
    from,
    to,
    dataSource: "local",
    txHash: "0x",
  }
}

const tokens = [{ holdingKey: "token", contractAddress: TOKEN, decimals: 6 }]

describe("balancesBefore", () => {
  it("takes a span's net transfers back off its ending balance", () => {
    const before = balancesBefore({
      account: ACCOUNT,
      tokens,
      balancesAtEnd: { token: 10 },
      transfers: [
        // Received 5, sent 2: the balance was 3 lower before the span.
        transfer(TOKEN, 5_000_000n, OTHER, ACCOUNT),
        transfer(TOKEN, 2_000_000n, ACCOUNT, OTHER),
      ],
    })
    expect(before).toEqual({ token: 7 })
  })

  it("ignores other tokens' transfers and transfers to itself", () => {
    const before = balancesBefore({
      account: ACCOUNT,
      tokens,
      balancesAtEnd: { token: 10 },
      transfers: [
        transfer(OTHER_TOKEN, 5_000_000n, OTHER, ACCOUNT),
        transfer(TOKEN, 4_000_000n, ACCOUNT, ACCOUNT),
      ],
    })
    expect(before).toEqual({ token: 10 })
  })

  it("doesn't go below zero when transfers are missing", () => {
    const before = balancesBefore({
      account: ACCOUNT,
      tokens,
      balancesAtEnd: { token: 1 },
      transfers: [transfer(TOKEN, 5_000_000n, OTHER, ACCOUNT)],
    })
    expect(before).toEqual({ token: 0 })
  })
})
