// TODO get all token balances of interest and store them

import {
  fetchAndValidateTokenList,
  networkAssetsFromLists,
} from "../../lib/tokenList"
import { getDB } from "./db"
import { getTokenListPreferences } from "../preferences"

export async function handleAlarm(): Promise<void> {
  const db = await getDB()
  const tokenListPrefs = await getTokenListPreferences()
  // make sure each is loaded
  await Promise.all(
    tokenListPrefs.urls.map(async (url) => {
      const cachedList = await db.getLatestTokenList(url)
      if (!cachedList) {
        const newListRef = await fetchAndValidateTokenList(url)
        await db.saveTokenList(url, newListRef.tokenList)
      }
    })
  )
  // TODO if autoUpdate is true, pull the latest and update if the version has gone up
  // TODO token balance checks!
}

export async function getCachedNetworkAssets() {
  const tokenListPrefs = await getTokenListPreferences()
  const db = await getDB()
  const tokenLists = await db.getLatestTokenLists(tokenListPrefs.urls)
  return networkAssetsFromLists(tokenLists)
}
