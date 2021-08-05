import {
  fetchAndValidateTokenList,
  networkAssetsFromLists,
} from "../../lib/tokenList"
import { getBalances as getTokenBalances } from "../../lib/erc20"
import { getDB } from "./db"
import { getTokenListPreferences } from "../preferences"

export async function handleAlarm(): Promise<void> {
  const db = await getDB()
  const tokenListPrefs = await getTokenListPreferences()
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
      await db.getAccountsToTrack()
    ).map(async ({ account }) => {
      const balances = await getTokenBalances(erc20TokensToTrack, account)
      await db.balances.bulkAdd(balances)
    })
  )
}

export async function getCachedNetworkAssets() {
  const tokenListPrefs = await getTokenListPreferences()
  const db = await getDB()
  const tokenLists = await db.getLatestTokenLists(tokenListPrefs.urls)
  return networkAssetsFromLists(tokenLists)
}
