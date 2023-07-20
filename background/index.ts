import browser from "webextension-polyfill"

import { Store as ProxyStore } from "webext-redux"
import { Delta, patch as patchDeepDiff } from "jsondiffpatch"
import { produce } from "immer"
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
    patchStrategy: <T>(oldObj: T, patchesWrapper: [Delta] | []) => {
      if (patchesWrapper.length === 0) {
        return oldObj
      }

      const result = produce(oldObj, (draft) =>
        patchDeepDiff(draft, patchesWrapper[0])
      )

      return result
    },
  })
  await proxyStore.ready()

  return proxyStore
}

/**
 * Starts the API subsystems, including all services.
 */
export async function startMain(): Promise<Main> {
  const mainService = await Main.create()

  mainService.startService()

  return mainService.started()
}
