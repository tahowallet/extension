import {
  attachPopupUIToRootElement,
  attachUIToRootElement,
} from "@tallyho/tally-ui"
import GlobalError from "@tallyho/tally-ui/components/GlobalError/GlobalError"

let counter = 0

const timerId = setInterval(() => {
  counter += 1
  if (counter > 2) {
    clearInterval(timerId)
    attachUIToRootElement(GlobalError)
  } else {
    const isAppRendered = !!document.getElementsByClassName(
      "top_menu_wrap_decoy"
    ).length
    if (isAppRendered) {
      clearInterval(timerId)
    }
  }
}, 1000)

attachPopupUIToRootElement()
