import { WALLET_CONNECT_INJECTED_UI } from "./wallet-connect"

const TAHO_ICON_URL =
  "https://taho.xyz/icons/icon-144x144.png?v=41306c4d4e6795cdeaecc31bd794f68e"

const TAHO_NAME = "Taho"
const METAMASK = "MetaMask"
const INJECTED = "Injected"

const observeMutations = (handler: (node: Node) => void) => {
  document.addEventListener("DOMContentLoaded", () => {
    const observer = new MutationObserver((mutations) => {
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

const moreThanOneWalletInstalledAndTahoIsNotDefault = (): boolean => {
  if (
    window.ethereum &&
    // OK to use window.ethereum.providers here since we don't strip
    // it out for gmx.io in cachedWindowEthereumProxy.
    Array.isArray(window.ethereum.providers) &&
    window.ethereum.providers.length > 1
  ) {
    // If the user has more than 1 wallet installed
    if (!window.ethereum.tallySetAsDefault) {
      // And Taho is not set as the default - return true
      return true
    }
  }
  // Otherwise - if the user only has Taho installed - or if they have multiple
  // wallets installed and have Taho as their default wallet - return false
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
      // Replace the arrow icon with the Taho icon
      iconAndTextDiv.innerHTML = iconAndTextDiv.innerHTML.replace(
        /\ssrc="(.+)"\s/,
        ` src="${TAHO_ICON_URL}" `
      )

      // Replace the `Injected` text with `Taho`
      iconAndTextDiv.innerHTML = iconAndTextDiv.innerHTML.replace(
        "Injected",
        TAHO_NAME
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
    textNode.textContent = TAHO_NAME
    img.src = TAHO_ICON_URL
  }
}

function findAndReplaceGMXMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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
        option.innerHTML = option.innerHTML.replaceAll(METAMASK, TAHO_NAME)
        // Replace metamask icon with Taho icon
        option.innerHTML = option.innerHTML.replace(
          /\ssrc="(.+)"\s/,
          ` src="${TAHO_ICON_URL}" `
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
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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
      TAHO_NAME
    )

    const metamaskIcon = container?.children?.[2]

    if (!metamaskIcon) {
      return
    }

    metamaskIcon.removeChild(metamaskIcon.children[0])
    const tahoIcon = document.createElement("img")
    tahoIcon.src = TAHO_ICON_URL
    metamaskIcon.appendChild(tahoIcon)
  }
}

function findAndReplaceTofuNftMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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

    textNode.innerHTML = textNode.innerHTML.replace(METAMASK, TAHO_NAME)

    metaMaskContainer.removeChild(metaMaskContainer.children[0])
    const tahoIcon = document.createElement("img")
    tahoIcon.src = TAHO_ICON_URL
    tahoIcon.setAttribute("height", "45px")
    tahoIcon.setAttribute("width", "45px")
    metaMaskContainer.appendChild(tahoIcon)
    metaMaskContainer.appendChild(metaMaskContainer.children[0])
  }
}

function findAndReplaceAboardMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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
  for (const child of maybeIconsContainer.children?.[0]?.children ?? []) {
    if (child.innerHTML.includes("img/metamask")) {
      child.innerHTML = child.innerHTML.replace(
        /\ssrc="(.+)"\s/,
        ` src="${TAHO_ICON_URL}" `
      )
    }
  }
}

const createTahoImg = (): HTMLImageElement => {
  const tahoIcon = document.createElement("img")
  tahoIcon.src = TAHO_ICON_URL
  tahoIcon.setAttribute("height", "48px")
  tahoIcon.setAttribute("width", "48px")
  return tahoIcon
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
          textContainer.textContent = TAHO_NAME

          iconContainer.removeChild(iconContainer.children[0])
          iconContainer.appendChild(createTahoImg())
          iconContainer.appendChild(iconContainer.children[0])
        }
      }
    }
  }
}

function findAndReplaceStargateFinanceMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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
          textContainer.textContent = TAHO_NAME

          const tahoIcon = document.createElement("img")
          tahoIcon.src = TAHO_ICON_URL
          tahoIcon.setAttribute("height", "24px")
          tahoIcon.setAttribute("width", "24px")
          iconContainer.removeChild(iconContainer.children[0])
          iconContainer.appendChild(tahoIcon)
          iconContainer.appendChild(iconContainer.children[0])
        }
      }
    }
  }
}

function findAndReplaceCelerMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
    return
  }

  if (addedNode instanceof HTMLElement) {
    if (addedNode.innerText?.includes(METAMASK)) {
      const modal = addedNode.querySelector(".ant-spin-container")

      if (modal instanceof HTMLElement) {
        // eslint-disable-next-line no-restricted-syntax
        for (const element of modal.children?.[0].children ?? []) {
          const textContainer =
            element.children?.[0]?.children?.[1].children?.[0]

          if (textContainer.innerHTML === METAMASK) {
            const img = element.querySelector("img")

            if (textContainer && img) {
              textContainer.textContent = TAHO_NAME
              img.src = TAHO_ICON_URL
            }
          }
        }
      }
    }

    /* Adding a Taho icon after login in the account view */
    if (
      addedNode.querySelector("img") &&
      addedNode.innerText?.includes("...")
    ) {
      const img = addedNode.querySelector("img")

      if (img) {
        img.src = TAHO_ICON_URL
      }
    }
  }
}

function findAndReplaceMultchainMetamaskAndInjectedOption(
  addedNode: Node
): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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
            textContainer.textContent = TAHO_NAME
            img.src = TAHO_ICON_URL
          }
        }
      }
    }
  }
}

function findAndReplaceVenusMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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
          textContainer.textContent = TAHO_NAME
          container.removeChild(container.children[0])
          const img = createTahoImg()
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
            textContainer.textContent = TAHO_NAME
            btn.removeChild(btn.children[0])
            btn.appendChild(createTahoImg())
            btn.appendChild(btn.children[0])
          }
        }
      }
    }
  }
}

function findAndReplaceAlpacaFinanceMetamaskOption(addedNode: Node): void {
  if (moreThanOneWalletInstalledAndTahoIsNotDefault()) {
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
          textNode.textContent = TAHO_NAME
          img.src = TAHO_ICON_URL
        }
      }
    }
  }
}

function addtahoButtonForWalletConnectModal(addedNode: Node): void {
  if (!(addedNode instanceof HTMLElement)) {
    return
  }

  let container: HTMLElement | null | undefined

  if (addedNode.children?.[1]?.className === "walletconnect-search__input") {
    container = addedNode
    // On slow network connections the connect buttons could appear after the search input
  } else if (
    addedNode.className === "walletconnect-connect__button__icon_anchor"
  ) {
    container = addedNode.parentElement?.parentElement
  }

  const walletButtonsWrapper = container?.children[2]
  const aWalletButton = walletButtonsWrapper?.children[2] as
    | HTMLAnchorElement
    | undefined

  if (!walletButtonsWrapper || !aWalletButton) {
    return
  }

  const aUrl = new URL(aWalletButton.href)

  const wcUri = aUrl.searchParams.get("uri")

  const injectedUI = document.createElement("div")
  injectedUI.innerHTML = WALLET_CONNECT_INJECTED_UI

  const tahoButton = injectedUI.querySelector("button")
  if (tahoButton) {
    tahoButton.onclick = () => {
      window?.tally?.send("tally_walletConnectInit", [wcUri])
    }
    walletButtonsWrapper.before(injectedUI)
  }
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
  const hostnames = Object.keys(hostnameToHandler) as Array<
    keyof typeof hostnameToHandler
  >

  hostnames.forEach((hostname) => {
    if (window.location.hostname.includes(hostname)) {
      observeMutations(hostnameToHandler[hostname])
    }
  })

  if (process.env.SUPPORT_WALLET_CONNECT === "true") {
    observeMutations(addtahoButtonForWalletConnectModal)
  }
}
