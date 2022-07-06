import browser from "webextension-polyfill"

import { Store as ProxyStore } from "webext-redux"
import patchDeepDiff from "webext-redux/lib/strategies/deepDiff/patch"
import { AnyAction } from "@reduxjs/toolkit"

import Main from "./main"
import { encodeJSON, decodeJSON } from "./lib/utils"

import { RootState } from "./redux-slices"

export { browser }

export type { RootState }

export type BackgroundDispatch = Main["store"]["dispatch"]

/**
 * Creates and returns a new webext-redux proxy store. This is a redux store
 * that works like any redux store, except that its contents and actions are
 * proxied to and from the master background store created when the API package
 * is first imported.
 *
 * The returned Promise resolves once the proxy store is ready and hydrated
 * with the current background store data.
 */
export async function newProxyStore(): Promise<
  ProxyStore<RootState, AnyAction>
> {
  const proxyStore = new ProxyStore({
    serializer: encodeJSON,
    deserializer: decodeJSON,
    patchStrategy: patchDeepDiff,
  })
  await proxyStore.ready()

  return proxyStore
}

/**
 * Starts the API subsystems, including all services.
 */
export async function startApi(): Promise<Main> {
  const mainService = await Main.create()

  mainService.startService()

  return mainService.started()
}
