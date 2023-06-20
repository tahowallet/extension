import browser from "webextension-polyfill"

/* eslint-disable import/prefer-default-export */
export const getMetaPort = (
  name: string,
  senderUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage: (message: any) => void
): Required<browser.Runtime.Port> => {
  const port: browser.Runtime.Port = browser.runtime.connect({
    name,
  })
  port.sender = {
    url: senderUrl,
  }
  port.postMessage = postMessage
  return port as unknown as Required<browser.Runtime.Port>
}
