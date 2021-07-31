import { browser, Runtime } from "webextension-polyfill-ts"
import { createPortProxy } from "./port-proxy"

// Disable while we figure out how we want to name.
// eslint-disable-next-line import/prefer-default-export
export function connectToBackgroundApi(name: string): typeof Proxy {
  const port = browser.runtime.connect(browser.runtime.id, { name })
  return createPortProxy(port)
}
