import browser from "webextension-polyfill"

import Main from "./main"

import { RootState } from "./redux-slices"

export { browser }

export type { RootState }

export type BackgroundDispatch = Main["store"]["dispatch"]

/**
 * Starts the API subsystems, including all services.
 */
export async function startApi(): Promise<Main> {
  const mainService = await Main.create()

  mainService.startService()

  return mainService.started()
}
