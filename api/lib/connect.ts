import { browser, Runtime } from "webextension-polyfill-ts"
import { createPortProxy } from "./port-proxy"

export function connectToBackgroundApi(name: string): typeof Proxy {
  const port = browser.runtime.connect({ name })
  return createPortProxy(port)
}
