import { attachUiToRootElement, Popup } from "@tallyho/tally-ui"

setTimeout(() => {
  const isAppRendered = !!document.getElementsByClassName("top_menu_wrap_decoy")
    .length

  if (!isAppRendered) {
    window.location.reload()
  }
}, 1000)

attachUiToRootElement(Popup)
