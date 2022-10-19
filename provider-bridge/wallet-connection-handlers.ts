const observeMutations = (handler: (node: Node) => void) => {
  document.addEventListener("DOMContentLoaded", () => {
    const observer = new MutationObserver(function monitorMutations(mutations) {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach(handler)
      })
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
    })
  })
}

const findAndReplaceUniswapInjectedOption = (addedNode: Node): void => {
  // Detect which version of web3-react
  const maybeButton = addedNode?.childNodes?.[2]?.childNodes?.[0]
    ?.childNodes?.[0]?.childNodes?.[0] as Element
  if (
    !!maybeButton &&
    maybeButton.id === "injected" &&
    maybeButton.parentElement?.getAttribute("data-testid") === "option-grid"
  ) {
    // Even though we can be reasonably sure that we've correctly identified
    // a change related to web3-react.  It never hurts to double check.
    const iconAndTextDiv = maybeButton?.children?.[0]?.children?.[0]

    if (iconAndTextDiv && iconAndTextDiv.innerHTML.includes("Injected")) {
      // Replace the arrow icon with the Tally Ho icon
      iconAndTextDiv.innerHTML = iconAndTextDiv.innerHTML.replace(
        /\ssrc="(.+)"\s/,
        ' src="https://tally.cash/icons/icon-144x144.png?v=41306c4d4e6795cdeaecc31bd794f68e" '
      )

      // Replace the `Injected` text with `Tally Ho`
      iconAndTextDiv.innerHTML = iconAndTextDiv.innerHTML.replace(
        "Injected",
        "Tally Ho"
      )
    }
  }
}

const findAndReplaceGMXMetamaskOption = (addedNode: Node): void => {
  if (
    addedNode.textContent?.includes("MetaMask") &&
    (addedNode as Element).classList.contains("Connect-wallet-modal")
  ) {
    const connectionOptions = (addedNode as Element)?.children?.[1]
      ?.children?.[2]?.children

    if (!connectionOptions) {
      return
    }
    // connectionOptions is an `Iterator` without a `forEach` equivalent method.
    // eslint-disable-next-line no-restricted-syntax
    for (const option of connectionOptions) {
      if (option.classList.contains("MetaMask-btn")) {
        option.innerHTML = option.innerHTML.replaceAll("MetaMask", "Tally Ho")
        // Replace metamask icon with Tally icon
        option.innerHTML = option.innerHTML.replace(
          /\ssrc="(.+)"\s/,
          ' src="https://tally.cash/icons/icon-144x144.png?v=41306c4d4e6795cdeaecc31bd794f68e" '
        )
      }
    }
  }
}

const hostnameToHandler = {
  "uniswap.org": findAndReplaceUniswapInjectedOption,
  "gmx.io": findAndReplaceGMXMetamaskOption,
} as const

export default function monitorForWalletConnectionPrompts(): void {
  ;(
    Object.keys(hostnameToHandler) as Array<keyof typeof hostnameToHandler>
  ).forEach((hostname) => {
    if (window.location.hostname.includes(hostname)) {
      observeMutations(hostnameToHandler[hostname])
    }
  })
}
