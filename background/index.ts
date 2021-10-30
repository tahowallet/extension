import browser from "webextension-polyfill"

import { Store as ProxyStore } from "webext-redux"
import { AnyAction } from "@reduxjs/toolkit"

import Main from "./main"
import { encodeJSON, decodeJSON } from "./lib/utils"
import { CONTENT_BACKGROUND_PORT } from "./constants"

export { browser }

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
    serializer: encodeJSON,
    deserializer: decodeJSON,
  })
  await proxyStore.ready()

  return proxyStore
}

function dumbContentScriptProviderPortService() {
  browser.runtime.onConnect.addListener(async (port) => {
    if (port.name === CONTENT_BACKGROUND_PORT) {
      port.onMessage.addListener((msg) => {
        // to demonstrate how it works it was necessary. Will remove later
        // eslint-disable-next-line no-console
        console.log("background: Content script msg recieved: ", msg)
        port.postMessage("pong")
      })
    }
  })
}

/**
 * Starts the API subsystems, including all services.
 */
export async function startApi(): Promise<Main> {
  const mainService = await Main.create()

  mainService.startService()

  dumbContentScriptProviderPortService()

  return mainService.started()
}
