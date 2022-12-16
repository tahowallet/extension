const TALLY_ICON_URL =
  "https://tally.cash/icons/icon-144x144.png?v=41306c4d4e6795cdeaecc31bd794f68e"

const TALLY_NAME = "Tally Ho"
const METAMASK = "MetaMask"
const INJECTED = "Injected"

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
        TALLY_NAME
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
      if (btn.innerText === METAMASK) {
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
    textNode.textContent = TALLY_NAME
    img.src = TALLY_ICON_URL
  }
}

function findAndReplaceGMXMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  if (
    addedNode.textContent?.includes(METAMASK) &&
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
        option.innerHTML = option.innerHTML.replaceAll(METAMASK, TALLY_NAME)
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
      TALLY_NAME
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

  if (addedNode.textContent?.includes(METAMASK)) {
    const metaMaskContainer = (addedNode as HTMLElement)?.children?.[0]
      ?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[1]
      ?.children?.[0]?.children?.[0] as HTMLElement

    if (!metaMaskContainer) {
      return
    }

    const textNode = metaMaskContainer.children[1]

    if (!textNode || textNode.textContent !== METAMASK) {
      return
    }

    textNode.innerHTML = textNode.innerHTML.replace(METAMASK, TALLY_NAME)

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

const createTallyImg = (): HTMLImageElement => {
  const tallyIcon = document.createElement("img")
  tallyIcon.src = TALLY_ICON_URL
  tallyIcon.setAttribute("height", "48px")
  tallyIcon.setAttribute("width", "48px")
  return tallyIcon
}

function findAndReplacePancakeSwapInjectedOption(addedNode: Node): void {
  if (
    addedNode instanceof HTMLElement &&
    addedNode.innerText?.includes(INJECTED)
  ) {
    const parentElement =
      addedNode.children?.[1].children?.[0].children?.[0].children?.[1]
        .children?.[0].children?.[1].children
    // eslint-disable-next-line no-restricted-syntax
    for (const element of parentElement) {
      const textContainer = element.children?.[1]

      if (textContainer?.innerHTML === INJECTED) {
        const iconContainer = element.children?.[0].children?.[0]

        if (textContainer && iconContainer) {
          textContainer.textContent = TALLY_NAME

          iconContainer.removeChild(iconContainer.children[0])
          iconContainer.appendChild(createTallyImg())
          iconContainer.appendChild(iconContainer.children[0])
        }
      }
    }
  }
}

function findAndReplaceStargateFinanceMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  const text = "Metamask"
  if (addedNode instanceof HTMLElement && addedNode.innerText?.includes(text)) {
    // eslint-disable-next-line no-restricted-syntax
    for (const li of addedNode.getElementsByTagName("li")) {
      if (li.innerText === text) {
        const textContainer = li.children?.[0]
        const iconContainer = li.children?.[1].children?.[0]

        if (textContainer && iconContainer) {
          textContainer.textContent = TALLY_NAME

          const tallyIcon = document.createElement("img")
          tallyIcon.src = TALLY_ICON_URL
          tallyIcon.setAttribute("height", "24px")
          tallyIcon.setAttribute("width", "24px")
          iconContainer.removeChild(iconContainer.children[0])
          iconContainer.appendChild(tallyIcon)
          iconContainer.appendChild(iconContainer.children[0])
        }
      }
    }
  }
}

function findAndReplaceCelerMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  if (addedNode instanceof HTMLElement) {
    if (addedNode.innerText?.includes(METAMASK)) {
      const modal = addedNode.querySelector(".ant-spin-container")

      if (modal instanceof HTMLElement) {
        // eslint-disable-next-line no-restricted-syntax
        for (const element of modal.children?.[0].children) {
          const textContainer =
            element.children?.[0]?.children?.[1].children?.[0]

          if (textContainer.innerHTML === METAMASK) {
            const img = element.querySelector("img")

            if (textContainer && img) {
              textContainer.textContent = TALLY_NAME
              img.src = TALLY_ICON_URL
            }
          }
        }
      }
    }

    /* Adding a tally icon after login in the account view */
    if (
      addedNode.querySelector("img") &&
      addedNode.innerText?.includes("...")
    ) {
      const img = addedNode.querySelector("img")

      if (img) {
        img.src = TALLY_ICON_URL
      }
    }
  }
}

function findAndReplaceMultchainMetamaskAndInjectedOption(
  addedNode: Node
): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  if (addedNode instanceof HTMLElement) {
    const getOptionName = (): string => {
      switch (true) {
        case addedNode.innerText?.includes(INJECTED):
          return INJECTED
        case addedNode.innerText?.includes(METAMASK):
          return METAMASK
        default:
          return ""
      }
    }
    const option = getOptionName()
    if (option) {
      // eslint-disable-next-line no-restricted-syntax
      for (const btn of addedNode.getElementsByTagName("button")) {
        if (btn.innerText === option) {
          const textContainer = btn.children?.[0]?.children?.[0]
          const img = btn.querySelector("img")

          if (textContainer && img) {
            textContainer.textContent = TALLY_NAME
            img.src = TALLY_ICON_URL
          }
        }
      }
    }
  }
}

function findAndReplaceVenusMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  if (
    addedNode instanceof HTMLElement &&
    addedNode.innerText?.includes(METAMASK)
  ) {
    /* Replace MetaMak option from account view */
    if (addedNode.innerText?.includes("Log out")) {
      const modal = addedNode.querySelector(".venus-modal")

      if (modal instanceof HTMLElement) {
        const container = modal.children?.[1].children?.[0].children?.[0]
        const textContainer = container.children?.[1].children?.[0]

        if (container && textContainer) {
          textContainer.textContent = TALLY_NAME
          container.removeChild(container.children[0])
          const img = createTallyImg()
          img.style.marginRight = "16px"
          container.appendChild(img)
          container.appendChild(container.children[0])
        }
      }
    } else {
      // eslint-disable-next-line no-restricted-syntax
      for (const btn of addedNode.getElementsByTagName("button")) {
        if (btn.innerText === METAMASK) {
          const textContainer = btn.children?.[1]
          const img = btn.children?.[0]

          if (textContainer && img) {
            textContainer.textContent = TALLY_NAME
            btn.removeChild(btn.children[0])
            btn.appendChild(createTallyImg())
            btn.appendChild(btn.children[0])
          }
        }
      }
    }
  }
}

function findAndReplaceAlpacaFinanceMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTallyIsNotDefault()) {
    return
  }

  if (
    addedNode instanceof HTMLElement &&
    addedNode.innerText?.includes(METAMASK)
  ) {
    // eslint-disable-next-line no-restricted-syntax
    for (const btn of addedNode.getElementsByTagName("button")) {
      if (btn.innerText === METAMASK) {
        const textNode = btn.children?.[0]?.children?.[0].children?.[0]
        const img = btn.querySelector("img")

        if (textNode && img) {
          textNode.textContent = TALLY_NAME
          img.src = TALLY_ICON_URL
        }
      }
    }
  }
}

function addTallyButtonForWalletConnectModal(addedNode: Node): void {
  // For some reason this fails with children but works with childNodes.
  // childNodes is a NodeList and Node elements don't have className in their types.
  // In reality it's there and works well.
  if (
    (addedNode?.childNodes[1] as unknown as HTMLElement)?.className !==
    "walletconnect-search__input"
  ) {
    return
  }

  const walletButtonsWrapper = (addedNode as unknown as HTMLElement)
    .children[2] as HTMLElement

  const aWalletButton = walletButtonsWrapper.children[2] as HTMLAnchorElement
  const aUrl = new URL(aWalletButton.href)

  const wcUri = aUrl.searchParams.get("uri")

  const tallyButton = document.createElement("button")
  tallyButton.innerHTML = "Here be doggos"
  tallyButton.onclick = () => {
    window?.tally?.send("tally_walletConnectInit", [wcUri])
  }
  walletButtonsWrapper.before(tallyButton)
}

const hostnameToHandler = {
  "uniswap.org": findAndReplaceUniswapInjectedOption,
  "gmx.io": findAndReplaceGMXMetamaskOption,
  "app.yieldprotocol.com": findAndReplaceYieldProtocolMetamaskOption,
  "tofunft.com": findAndReplaceTofuNftMetamaskOption,
  "aboard.exchange": findAndReplaceAboardMetamaskOption,
  "traderjoexyz.com": findAndReplaceJoeMetamaskOption,
  "pancakeswap.finance": findAndReplacePancakeSwapInjectedOption,
  "cbridge.celer.network": findAndReplaceCelerMetamaskOption,
  "stargate.finance": findAndReplaceStargateFinanceMetamaskOption,
  "app.multchain.cn.com": findAndReplaceMultchainMetamaskAndInjectedOption,
  "app.venus.io": findAndReplaceVenusMetamaskOption,
  "app.alpacafinance.org": findAndReplaceAlpacaFinanceMetamaskOption,
} as const

export default function monitorForWalletConnectionPrompts(): void {
  ;(
    Object.keys(hostnameToHandler) as Array<keyof typeof hostnameToHandler>
  ).forEach((hostname) => {
    if (window.location.hostname.includes(hostname)) {
      observeMutations(hostnameToHandler[hostname])
    }
  })

  observeMutations(addTallyButtonForWalletConnectModal)
}
