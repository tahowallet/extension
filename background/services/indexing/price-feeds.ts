import { BigNumber, Contract } from "ethers"
import { NETWORK_BY_CHAIN_ID } from "../../constants"
import type ChainService from "../chain"
import { isFulfilledPromise } from "../../lib/utils/type-guards"

// Chain link price feeds available at
// https://docs.chain.link/data-feeds/price-feeds/addresses
const FEED_CONTRACTS: Record<string, { contract: string; chainID: string }> = {
  "EUR/USD": {
    contract: "0xb49f677943BC038e9857d61E7d053CaA2C1734C1",
    chainID: "1",
  },
  "AUD/USD": {
    contract: "0x77F9710E7d0A19669A13c055F62cd80d313dF022",
    chainID: "1",
  },
  "JPY/USD": {
    contract: "0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3",
    chainID: "1",
  },
  "CNY/USD": {
    contract: "0x04bB437Aa63E098236FA47365f0268547f6EAB32",
    chainID: "137",
  },
  "GBP/USD": {
    contract: "0x099a2540848573e94fb1Ca0Fa420b00acbBc845a",
    chainID: "137",
  },
  "PLN/USD": {
    contract: "0xB34BCE11040702f71c11529D00179B2959BcE6C0",
    chainID: "137",
  },
}

export const SUPPORTED_CURRENCIES = new Set(
  Object.keys(FEED_CONTRACTS).map((id) => id.split("/")[0]),
)

type FeedRate = {
  id: string
  value: bigint
  decimals: bigint
  time: number
}

export default async function fetchRatesFromPriceFeeds(
  chainService: ChainService,
): Promise<Record<string, FeedRate>> {
  const result = await Promise.allSettled(
    Object.entries(FEED_CONTRACTS).map(async ([id, feed]) => {
      const network = NETWORK_BY_CHAIN_ID[feed.chainID]

      if (!chainService.providerForNetwork(network)) {
        await chainService.startTrackingNetworkOrThrow(feed.chainID)
      }

      const provider = chainService.providerForNetworkOrThrow(network)

      const contract = new Contract(
        feed.contract,
        [
          "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
          "function decimals() external view returns (uint8)",
        ],
        provider,
      )

      const decimals = contract.callStatic.decimals()
      const roundData = await contract.callStatic.latestRoundData()

      return {
        id,
        value: roundData.answer as BigNumber,
        decimals: (await decimals) as number,
        time: Date.now(),
      }
    }),
  )

  return Object.fromEntries(
    result.filter(isFulfilledPromise).map(({ value: feed }) => [
      feed.id,
      {
        id: feed.id,
        value: feed.value.toBigInt(),
        decimals: BigInt(feed.decimals),
        time: feed.time,
      },
    ]),
  )
}
