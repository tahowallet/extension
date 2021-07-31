import { FiatCurrency } from "../../types"
import { getDB, getOrCreateDB } from "./db"

export async function startService(): Promise<void> {
  const db = await getOrCreateDB()
}

export async function stopService(): Promise<void> {
  // TODO
}

export async function getCurrency(): Promise<FiatCurrency> {
  const db = await getDB()
  return (await db.getLatestPreferences()).currency
}

export async function getPrioritizedTokenListURLs(): Promise<string[]> {
  const db = await getDB()
  return (await db.getLatestPreferences()).tokenListURLs
}
