import browser from "webextension-polyfill"

import { Store as ProxyStore } from "webext-redux"
import { produce } from "immer"
import { Action, AnyAction, ThunkAction, ThunkDispatch } from "@reduxjs/toolkit"

import { Delta, patch as patchDeepDiff } from "./differ"
import Main from "./main"
import { encodeJSON, decodeJSON } from "./lib/utils"

import { RootState } from "./redux-slices"
import { BackgroundAsyncThunkAction } from "./redux-slices/utils"

export { browser }

export type { RootState }

type BackgroundAsyncThunkDispatch<S, E, A extends Action> = {
  // BackgroundAsyncThunks, unlike regular AsyncThunks, produce the direct
  // result of their action as their return value. Errors are handled higher up
  // in the stack in webext-redux, and generally are not expected to be
  // communication-based, since background async thunks run in the background
  // script, thus only going through a simple browser port that is expected to
  // be reliable except in particularly unusual circumstances..
  <TypePrefix extends string, Returned>(
    asyncAction: BackgroundAsyncThunkAction<TypePrefix, Returned>
  ): Promise<Returned>
  <T extends A>(action: T): Promise<T>
  <R>(asyncAction: ThunkAction<R, S, E, A>): R
}

// Take a ThunkDispatch as produced by Redux typing and wrap it in
// BackgroundAsyncThunkDispatch, which takes care of:
//
// - The fact that webext-redux wraps all action results in Promises.
// - The fact that we have a special type, BackgroundAsyncThunk, that
//   behaves a little differently from AsyncThunk by producing its result
//   directly at the dispatch site, instead of producing a triplet of
//   fulfilled/rejected/complete functions.
type BackgroundAsyncThunkDispatchify<T> = T extends ThunkDispatch<
  infer S,
  infer E,
  infer A
>
  ? BackgroundAsyncThunkDispatch<S, E, A>
  : never

export type BackgroundDispatch = BackgroundAsyncThunkDispatchify<
  Main["store"]["dispatch"]
>

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
