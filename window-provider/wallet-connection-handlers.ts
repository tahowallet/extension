const TALLY_ICON_URL =
  "https://tally.cash/icons/icon-144x144.png?v=41306c4d4e6795cdeaecc31bd794f68e"

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

const moreThanOneWalletInstalledAndTallyIsNotDefault = (): boolean => {
  if (
    window.ethereum &&
    // OK to use window.ethereum.providers here since we don't strip
    // it out for gmx.io in cachedWindowEthereumProxy.
    Array.isArray(window.ethereum.providers) &&
    window.ethereum.providers.length > 1
  ) {
    // If the user has more than 1 wallet installed
    if (!window.ethereum.tallySetAsDefault) {
      // And Tally is not set as the default - return true
      return true
    }
  }
  // Otherwise - if the user only has tally installed - or if they have multiple
  // wallets installed and have Tally as their default wallet - return false
  return false
}

const findAndReplaceUniswapInjectedOption = (): void => {
  const maybeButton = document.getElementById("injected")
  if (
    !!maybeButton &&
    maybeButton.parentElement?.getAttribute("data-testid") === "option-grid"
  ) {
    // Even though we can be reasonably sure that we've correctly identified
    // a change related to the uniswap connect modal.  It never hurts to double check.
    const iconAndTextDiv = maybeButton?.children?.[0]?.children?.[0]

    if (iconAndTextDiv && iconAndTextDiv.innerHTML.includes("Injected")) {
      // Replace the arrow icon with the Tally Ho icon
      iconAndTextDiv.innerHTML = iconAndTextDiv.innerHTML.replace(
        /\ssrc="(.+)"\s/,
        ` src="${TALLY_ICON_URL}" `
      )

      // Replace the `Injected` text with `Tally Ho`
      iconAndTextDiv.innerHTML = iconAndTextDiv.innerHTML.replace(
        "Injected",
        "Tally Ho"
      )
    }
  }
}

function findAndReplaceGMXMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

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
          ` src="${TALLY_ICON_URL}" `
        )
      }
    }
  }
}

const findYieldProtocolMetamaskContainer = (node: Node): Element | undefined =>
  // Container if user has not checked Terms of Service yet
  (node as HTMLElement)?.children?.[0]?.children?.[1]?.children?.[4]
    ?.children?.[0]?.children?.[0]?.children?.[0] ||
  // Container if user has checked Terms of Service
  (node as HTMLElement)?.children?.[0]?.children?.[1]?.children?.[2]
    ?.children?.[0]?.children?.[0]?.children?.[0] ||
  // Container right after user has checked Terms of service
  // Its important that this check is last as it is the least specific
  (node as HTMLElement)?.children?.[0]?.children?.[0]?.children?.[0]

function findAndReplaceYieldProtocolMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  if (addedNode.textContent?.includes("Metamask")) {
    const container = findYieldProtocolMetamaskContainer(addedNode)

    if (!container) {
      return
    }
    const metamaskText = container?.children?.[0]

    if (
      !metamaskText ||
      (metamaskText as HTMLElement).innerText !== "Metamask"
    ) {
      return
    }

    metamaskText.innerHTML = metamaskText.innerHTML.replace(
      "Metamask",
      "Tally Ho"
    )

    const metamaskIcon = container?.children?.[2]

    if (!metamaskIcon) {
      return
    }

    metamaskIcon.removeChild(metamaskIcon.children[0])
    const tallyIcon = document.createElement("img")
    tallyIcon.src = TALLY_ICON_URL
    metamaskIcon.appendChild(tallyIcon)
  }
}

const hostnameToHandler = {
  "uniswap.org": findAndReplaceUniswapInjectedOption,
  "gmx.io": findAndReplaceGMXMetamaskOption,
  "app.yieldprotocol.com": findAndReplaceYieldProtocolMetamaskOption,
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
