import { WINDOW_PROVIDER_FLAG } from "@tallyho/provider-bridge-shared"
import TallyWindowProvider from "@tallyho/window-provider"

const enabled = window.localStorage.getItem(WINDOW_PROVIDER_FLAG)

if (enabled === "true") {
  // The window object is considered unsafe, because other extensions could have modified them before this script is run.
  // For 100% certainty we could create an iframe here, store the references and then destoroy the iframe.
  //   something like this: https://speakerdeck.com/fransrosen/owasp-appseceu-2018-attacking-modern-web-technologies?slide=95
  window.tally = new TallyWindowProvider({
    postMessage: (data: unknown) => {
      return window.postMessage(data, window.location.origin)
    },
    addEventListener: window.addEventListener.bind(this),
    removeEventListener: window.removeEventListener.bind(this),
    origin: window.location.origin,
  })
  window.ethereum = window.tally
}
