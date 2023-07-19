import browser from "webextension-polyfill"

import { Store as ProxyStore } from "webext-redux"
import { Delta, patch as patchDeepDiff } from "jsondiffpatch"
import { produce } from "immer"
import { AnyAction } from "@reduxjs/toolkit"
import { debounce } from "lodash"

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
  const updates: Delta[] = []

  const queueUpdate = debounce(
    <T>(lastState: T, updater: (updatedState: T) => void) => {
      const updatedState = produce(lastState, (draft) => {
        while (updates.length) {
          // updates is guaranteed to hold a delta
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          patchDeepDiff(draft, updates.shift()!)
        }
      })

      updater(updatedState)
    },
    16,
    { trailing: true, maxWait: 30 }
  )

  const proxyStore = new ProxyStore({
    serializer: encodeJSON,
    deserializer: decodeJSON,
    patchStrategy<T>(
      this: ProxyStore,
      oldObj: T,
      patchesWrapper: [Delta] | []
    ) {
      if (patchesWrapper.length === 0) {
        return oldObj
      }

      updates.push(patchesWrapper[0])
      queueUpdate(oldObj, (updatedState) => this.replaceState(updatedState))

      return oldObj
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
