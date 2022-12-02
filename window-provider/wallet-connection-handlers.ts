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

const findAndReplaceJoeMetamaskOption = (addedNode: Node): void => {
  let maybeButton = document.getElementById("connect-INJECTED")

  // Replacing innerHTML here causes a render loop
  if (!maybeButton && !(addedNode instanceof HTMLElement)) {
    return
  }

  if (
    !maybeButton &&
    // cmon typescript
    addedNode instanceof HTMLElement
  ) {
    // eslint-disable-next-line no-restricted-syntax
    for (const btn of addedNode.getElementsByTagName("button")) {
      if (btn.innerText === "MetaMask") {
        maybeButton = btn
      }
    }
  }

  if (!maybeButton) {
    return
  }

  const textNode = maybeButton.children?.[0]?.children?.[0]
  const img = maybeButton.querySelector("img")

  if (textNode && img) {
    textNode.textContent = "Tally Ho"
    img.src = TALLY_ICON_URL
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

function findAndReplaceTofuNftMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  if (addedNode.textContent?.includes("MetaMask")) {
    const metaMaskContainer = (addedNode as HTMLElement)?.children?.[0]
      ?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[1]
      ?.children?.[0]?.children?.[0] as HTMLElement

    if (!metaMaskContainer) {
      return
    }

    const textNode = metaMaskContainer.children[1]

    if (!textNode || textNode.textContent !== "MetaMask") {
      return
    }

    textNode.innerHTML = textNode.innerHTML.replace("MetaMask", "Tally Ho")

    metaMaskContainer.removeChild(metaMaskContainer.children[0])
    const tallyIcon = document.createElement("img")
    tallyIcon.src = TALLY_ICON_URL
    tallyIcon.setAttribute("height", "45px")
    tallyIcon.setAttribute("width", "45px")
    metaMaskContainer.appendChild(tallyIcon)
    metaMaskContainer.appendChild(metaMaskContainer.children[0])
  }
}

function findAndReplaceAboardMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  const maybeIconsContainer = (addedNode as HTMLElement)?.children?.[0]
    ?.children?.[0]?.children?.[0]?.children?.[1]?.children?.[1]

  if (
    !maybeIconsContainer ||
    !maybeIconsContainer.classList.contains("wallets-wrapper")
  ) {
    return
  }

  // children are `HTMLCollection`'s without array methods.
  // eslint-disable-next-line no-restricted-syntax
  for (const child of maybeIconsContainer.children?.[0]?.children) {
    if (child.innerHTML.includes("img/metamask")) {
      child.innerHTML = child.innerHTML.replace(
        /\ssrc="(.+)"\s/,
        ` src="${TALLY_ICON_URL}" `
      )
    }
  }
}

const hostnameToHandler = {
  "uniswap.org": findAndReplaceUniswapInjectedOption,
  "gmx.io": findAndReplaceGMXMetamaskOption,
  "app.yieldprotocol.com": findAndReplaceYieldProtocolMetamaskOption,
  "tofunft.com": findAndReplaceTofuNftMetamaskOption,
  "aboard.exchange": findAndReplaceAboardMetamaskOption,
  "traderjoexyz.com": findAndReplaceJoeMetamaskOption,
} as const

export default function monitorForWalletConnectionPrompts(): void {
  ;(
    Object.keys(hostnameToHandler) as Array<keyof typeof hostnameToHandler>
  ).forEach((hostname) => {
    if (
      typeof window !== "undefined" &&
      window.location.hostname.includes(hostname)
    ) {
      observeMutations(hostnameToHandler[hostname])
    }
  })
}
