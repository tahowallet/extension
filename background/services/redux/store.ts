// Utilities for initializing the redux store, caching it to local storage,
// restoring it from local storage, and connecting it efficiently to the popup
// proxy stores.
import browser from "webextension-polyfill"
import { alias, createWrapStore } from "webext-redux"
import { Middleware, configureStore, isPlain } from "@reduxjs/toolkit"

import { debounce } from "lodash"

import { devToolsEnhancer } from "@redux-devtools/remote"
import { decodeJSON, encodeJSON } from "../../lib/utils"
import {
  REDUX_STATE_VERSION,
  migrateReduxState,
} from "../../redux-slices/migrations"
import rootReducer from "../../redux-slices"
import { allAliases } from "../../redux-slices/utils"

import { diff as deepDiff, patch } from "./differ"
import logger from "../../lib/logger"

// Manifest v3/webext-redux v3 requirement, create at the top level to properly
// attach to event handlers.
const wrapStore = createWrapStore()

// This sanitizer runs on store and action data before serializing for remote
// redux devtools. The goal is to end up with an object that is directly
// JSON-serializable and deserializable; the remote end will display the
// resulting objects without additional processing or decoding logic.
const devToolsSanitizer = (input: unknown) => {
  switch (typeof input) {
    // We can make use of encodeJSON instead of recursively looping through
    // the input
    case "bigint":
    case "object":
      return JSON.parse(encodeJSON(input))
    // We only need to sanitize bigints and objects that may or may not contain
    // them.
    default:
      return input
  }
}

async function persistStoreBsae<T>(state: T) {
  if (process.env.WRITE_REDUX_CACHE === "true") {
    // Browser extension storage supports JSON natively, despite that we have
    // to stringify to preserve BigInts
    await browser.storage.local.set({
      state: encodeJSON(state),
      version: REDUX_STATE_VERSION,
    })
  }
}

// Debounced storage persistence to avoid excessive JSON serialization.
const persistStore = debounce(persistStoreBsae, 50, {
  trailing: true,
  maxWait: 50,
})

const reduxCache: Middleware = (store) => (next) => (action) => {
  const result = next(action)
  const state = store.getState()

  persistStore(state)
  return result
}

export async function readAndMigrateState() {
  let savedReduxState: Record<string, unknown> = {}
  // Setting READ_REDUX_CACHE to false will start the extension with an empty
  // initial state, which can be useful for development
  if (process.env.READ_REDUX_CACHE === "true") {
    const { state, stateDiffs, version } = (await browser.storage.local.get([
      "state",
      "stateDiffs",
      "version",
    ])) as { state: string; stateDiffs: string; version?: number }

    if (state) {
      const restoredState = (stateDiffs ?? "")
        .split("\n")
        .filter((entry) => entry.length > 0)
        .reduce(
          (previousState, currentStateDiffString) =>
            patch(previousState, JSON.parse(currentStateDiffString)),
          decodeJSON(state),
        )

      if (typeof restoredState === "object" && restoredState !== null) {
        // If someone managed to sneak JSON that decodes to typeof "object"
        // but isn't a Record<string, unknown>, there is a very large
        // problem...
        savedReduxState = migrateReduxState(
          restoredState as Record<string, unknown>,
          version || undefined,
        )

        // During migration, use the low-level non-debounced store to store the
        // migrated result.
        await persistStoreBsae(savedReduxState)
      } else {
        throw new Error(`Unexpected JSON persisted for state: ${state}`)
      }
    }
  }

  return savedReduxState
}

/**
 * Initializes the redux store used by the background script, which is also
 * designed to be a host store for webext-redux remote proxy stores on
 * extension popups.
 */
export function initializeStore<ThunkArgType>(
  thunkArgument: ThunkArgType,
  preloadedState: object,
) {
  const baseStore = configureStore({
    preloadedState,
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: {
          isSerializable: (value: unknown) =>
            isPlain(value) || typeof value === "bigint",
        },
        thunk: { extraArgument: { main: thunkArgument } },
      })

      // It might be tempting to use an array with `...` destructuring, but
      // unfortunately this fails to preserve important type information from
      // `getDefaultMiddleware`. `push` and `pull` preserve the type
      // information in `getDefaultMiddleware`, including adjustments to the
      // dispatch function type, but as a tradeoff nothing added this way can
      // further modify the type signature. For now, that's fine, as these
      // middlewares don't change acceptable dispatch types.
      //
      // Process aliases before all other middleware, and cache the redux store
      // after all middleware gets a chance to run.
      middleware.unshift(alias(allAliases))
      middleware.push(reduxCache)

      return middleware
    },
    devTools: false,
    enhancers:
      process.env.NODE_ENV === "development"
        ? [
            devToolsEnhancer({
              hostname: "localhost",
              port: 8000,
              realtime: true,
              actionSanitizer: devToolsSanitizer,
              stateSanitizer: devToolsSanitizer,
            }),
          ]
        : [],
  })

  /**
   * Tracks pending updates to the redux store. This is used to delay responding
   * to dispatched thunks until the store has been updated in the UI. This is
   * necessary to prevent race conditions where the UI expects the store to be
   * updated before the thunk has finished dispatching.
   */
  let storeUpdateLock: Promise<void> | null
  let releaseLock: () => void

  const queueUpdate = debounce(
    (lastState, newState, updateFn) => {
      if (lastState !== newState) {
        const diff = deepDiff(lastState, newState)

        if (diff !== undefined) {
          updateFn(newState, [diff])
        }
      }
      releaseLock()
    },
    30,
    { maxWait: 30, trailing: true },
  )

  wrapStore(baseStore, {
    serializer: encodeJSON,
    deserializer: decodeJSON,
    diffStrategy: (oldObj, newObj, forceUpdate) => {
      if (!storeUpdateLock) {
        storeUpdateLock = new Promise((resolve) => {
          releaseLock = () => {
            resolve()
            storeUpdateLock = null
          }
        })
      }

      queueUpdate(oldObj, newObj, forceUpdate)

      // Return no diffs as we're manually handling these inside `queueUpdate`
      return []
    },
    dispatchResponder: async (
      dispatchResult: Promise<unknown> | unknown,
      send: (param: { error: string | null; value: unknown | null }) => void,
    ) => {
      try {
        // if dispatch is a thunk, wait for the result
        const result = await dispatchResult

        // By this time, all pending updates should've been tracked.
        // since we're dealing with a thunk, we need to wait for
        // the store to be updated
        await storeUpdateLock

        send({
          error: null,
          value: encodeJSON(result),
        })
      } catch (error) {
        logger.error(
          "Error awaiting and dispatching redux store result: ",
          error,
        )

        // Store could still have been updated if there was an error
        await storeUpdateLock

        send({
          error: encodeJSON(error),
          value: null,
        })
      }
    },
  })

  return baseStore
}

export type ReduxStoreType = ReturnType<typeof initializeStore>
