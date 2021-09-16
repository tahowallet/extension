import { Store as ProxyStore } from "webext-redux"
import { AnyAction } from "@reduxjs/toolkit"
import Main from "./main"
import { jsonEncodeBigInt, jsonDecodeBigInt } from "./lib/utils"

export { browser } from "webextension-polyfill-ts"
export type RootState = ReturnType<Main["store"]["getState"]>
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
    serializer: (payload: unknown) => {
      return jsonEncodeBigInt(payload)
    },
    deserializer: (payload: string) => {
      return jsonDecodeBigInt(payload)
    },
  })
  await proxyStore.ready()

  return proxyStore
}

/**
 * Starts the API subsystems, including all services.
 */
export async function startApi(): Promise<Main> {
  return new Main()
}
