import { browser } from "webextension-polyfill-ts"

export async function getPersistedState (key : string) {
  return await browser.storage.local.get(key)
}

export async function persistState(key : string, newState : any) {
  let params = {}
  params[key] = newState
  await browser.storage.local.set(params)
}
