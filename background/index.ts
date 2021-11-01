import browser from "webextension-polyfill"

import { Store as ProxyStore } from "webext-redux"
import { AnyAction } from "@reduxjs/toolkit"

import Main from "./main"
import { encodeJSON, decodeJSON } from "./lib/utils"

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
    /**
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getURL
     * This will be the generated ID for the extension, known only at runtime but this URL
     * also includes the id of the extension.
     * e.g.:
     *   chrome-extension://gkfdocgjpaiedapkhonocomfepcpnmhm/
     *   moz-extension://2c127fa4-62c7-7e4f-90e5-472b45eecfdc/beasts/frog.html
     */
    const extensionBaseUrl = browser.runtime.getURL("")
    /**
     * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender
     * id Optional
     * string. The ID of the extension that sent the message, if the message was sent by an extension.
     * If the sender set an ID explicitly using the applications key in manifest.json, then id will have this value.
     * Otherwise it will have the ID that was generated for the sender.
     *
     * Note that in Firefox, before version 54, this value was the extension's internal ID
     * (that is, the UUID that appears in the extension's URL).
     *
     * Note: Firefox 54 is from 2017 and firefox is evergreen so it's a pretty safe bet to assume that this will
     * have what we expect here.
     */
    const senderId = port.sender?.id
    // We care about only ports openb by our own content script
    // Here we rely on the fact that to some extent both the content script
    // and background script are part of the same extension.
    // So a) we rely on built in apis b) we use info from both sides and compare them
    if (senderId && extensionBaseUrl.includes(senderId)) {
      // TODO: needs protection against others sending messages through our port
      port.onMessage.addListener((msg) => {
        const payload = JSON.parse(msg) // TODO try catch

        if (payload.target !== "background") return
        // to demonstrate how it works it was necessary. Will remove later
        // eslint-disable-next-line no-console
        console.log(`background: ${msg}`)
        // TODO: implement protection that content script could use
        port.postMessage(
          JSON.stringify({
            target: payload.source,
            source: payload.target,
            message: `pong ${payload.message}`,
          })
        )
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
