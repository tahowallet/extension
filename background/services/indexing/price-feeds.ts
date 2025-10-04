import { BigNumber, Contract } from "ethers"
import { ETHEREUM } from "../../constants"
import type ChainService from "../chain"
import { isFulfilledPromise } from "../../lib/utils/type-guards"

const feedContracts = {
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
}

type FeedRate = {
  id: string
  value: bigint
  decimals: bigint
  time: number
}

export default async function fetchRatesFromPriceFeeds(
  chainService: ChainService,
): Promise<Record<string, FeedRate>> {
  const provider = chainService.providerForNetworkOrThrow(ETHEREUM)

  const result = await Promise.allSettled(
    Object.entries(feedContracts).map(async ([id, feed]) => {
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
