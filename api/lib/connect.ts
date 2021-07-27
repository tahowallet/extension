import { createPortProxy } from './port-proxy'

import { browser, Runtime } from "webextension-polyfill-ts"

export function connectToBackgroundApi(name : string) : typeof Proxy {
  const port = browser.runtime.connect({ name })
  return createPortProxy(port)
}
