import { AlchemyProvider } from "@ethersproject/providers"
import {
  fetchAndValidateTokenList,
  networkAssetsFromLists,
} from "../../lib/tokenList"
import { getBalances as getTokenBalances } from "../../lib/erc20"
import PreferenceService from "../preferences/service"
import ChainService from "../chain/service"
import { IndexingDatabase } from "./db"

export async function handleAlarm(
  preferenceService: PreferenceService,
  chainService: ChainService,
  db: IndexingDatabase
): Promise<void> {
  const tokenListPrefs = await preferenceService.getTokenListPreferences()
  // make sure each token list in preferences is loaded
  await Promise.all(
    tokenListPrefs.urls.map(async (url) => {
      const cachedList = await db.getLatestTokenList(url)
      if (!cachedList) {
        const newListRef = await fetchAndValidateTokenList(url)
        await db.saveTokenList(url, newListRef.tokenList)
      }
    })
  )

  // TODO if tokenListPrefs.autoUpdate is true, pull the latest and update if
  // the version has gone up

  const tokensToTrack = await db.getTokensToTrack()
  // TODO only supports Ethereum mainnet, doesn't support multi-network assets
  // like USDC or CREATE2-based contracts on L1/L2
  const erc20TokensToTrack = tokensToTrack.filter(
    (t) => t.homeNetwork.chainID === "1"
  )

  await Promise.all(
    (
      await chainService.getAccountsToTrack()
    ).map(async ({ account }) => {
      // TODO proper provider lookup
      const balances = await getTokenBalances(
        chainService.pollingProviders.ethereum as AlchemyProvider,
        erc20TokensToTrack,
        account
      )
      await db.balances.bulkAdd(balances)
    })
  )
}

export async function getCachedNetworkAssets(
  preferenceService: PreferenceService,
  db: IndexingDatabase
) {
  const tokenListPrefs = await preferenceService.getTokenListPreferences()
  const tokenLists = await db.getLatestTokenLists(tokenListPrefs.urls)
  return networkAssetsFromLists(tokenLists)
}
