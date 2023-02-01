/* Injected at compile time, see webpack config */
const segmentB64 = `@@@SEGMENT_MEDIUM_BASE64@@@`

const tallyLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" fill="none"><path fill="#002825" fill-rule="evenodd" d="M33.501 17.822c.33.268.552.645.627 1.062.015.122.017.244.005.366-.032.096-.032.174-.032.261a3.739 3.739 0 0 1-.114.5c-.101.34-.256.663-.458.956-.038.055-.086.118-.12.161l-.027.036.008.028c.01.039.029.104.029.187.054.334.07.673.046 1.011a5.839 5.839 0 0 1-.458 1.895 4.27 4.27 0 0 1-1.176 1.63l-.06.05-.082.032c-.638.237-1.293.427-1.96.568-.684.16-1.388.229-2.091.206h-.119a20.868 20.868 0 0 0-4.476-.916 8.647 8.647 0 0 1-1.232-.174 9.54 9.54 0 0 1-1.208-.407c-.614-.22-1.24-.4-1.877-.54-.299.418-.437.93-.389 1.442.046.563.553 1.532.917 2.227l.205.395a5.365 5.365 0 0 1-.728 5.59c-.99-2.072-2.848-3.055-4.512-3.936-2.394-1.267-4.386-2.321-2.812-6.103.446-1.105.721-2.321.947-3.317.192-.846.348-1.533.541-1.86v.028a6.836 6.836 0 0 0 0 2.289c.06.355.194.693.394.993.207.273.486.484.805.609.69.273 1.42.437 2.16.485.38.055.76.055 1.145.055.203-.002.406.007.609.027.201.018.407.041.608.073.799.13 1.586.322 2.353.577.69.274 1.42.428 2.16.458 1.575.123 3.13.43 4.633.915a8.135 8.135 0 0 0 1.794-.137c.148-.028.294-.061.44-.094.066-.014.13-.03.196-.043 1.03-.302 2.206-1.9.86-1.749a7.404 7.404 0 0 0-1.112.137c-.332.068-.593.13-.813.183-.671.16-.964.23-1.75.092a7.134 7.134 0 0 0-1.716-.366 2.604 2.604 0 0 1 1.652-.403c.429.054.864.036 1.286-.055.214-.06.431-.178.666-.305.189-.101.389-.21.607-.299a5.56 5.56 0 0 1 1.922-.252 1.5 1.5 0 0 0 .39-1.3.98.98 0 0 0-.564-.407 14.32 14.32 0 0 0-.34-.068c-.678-.132-1.793-.348-2.237-.77-.306-.293-.471-1.185.609-1.432.571-.1 1.153-.12 1.73-.06.247.028.92.092 1.076-.036-.105-.364-1.291-1.013-2.472-1.66-1.035-.566-2.067-1.13-2.362-1.499a18.544 18.544 0 0 1-3.272-4.54 3.058 3.058 0 0 0-1.474-1.607c.798-.058 1.59.18 2.224.669.092.075.208.284.358.55.418.746 1.093 1.952 2.196 2a.646.646 0 0 0 .339-.06c-.546-.515-.914-1.136-1.26-1.718-.523-.882-.992-1.673-1.944-1.866l-.043-.017a6.87 6.87 0 0 1-.648-.28l-.646-.321-1.281-.623a21.62 21.62 0 0 0-2.61-1.057 13.488 13.488 0 0 0-2.713-.59 6.692 6.692 0 0 0-.66-.05c-.176 0-.35.042-.508.123-.109.045-.234.11-.359.174-.1.052-.201.103-.295.146l-.122.056c-.171.077-.343.156-.51.237-.836.405-1.625.9-2.352 1.478a6.144 6.144 0 0 0-1.42 1.396c.689-.05 1.38.04 2.033.261a7.323 7.323 0 0 0-5.195 2.532c-1.176 1.258-2.092 7.68-.76 9.378.65-.304 1.53-1.792 2.529-3.482 1.54-2.605 3.364-5.692 5.074-5.672-1.03.92-1.826 3.391-2.623 6.16-.64 2.248-2.815 7.375-4.188 7.498-.536.032-.732-.224-1.094-.746l-.302-.412a8.147 8.147 0 0 1-1.19-2.417c-.24-.848-.384-1.72-.43-2.6a16.936 16.936 0 0 1 .06-2.595c.092-.854.236-1.703.43-2.54.192-.838.441-1.663.745-2.467.083-.206.165-.408.27-.614.054-.115.115-.226.184-.334.078-.107.166-.208.26-.302a4.836 4.836 0 0 1 1.122-.796 7.56 7.56 0 0 1 1.9-.687c.208-.468.495-.898.846-1.272a8.83 8.83 0 0 1 1.13-.998 13.521 13.521 0 0 1 2.509-1.575c.21-.11.485-.233.668-.31.097-.042.199-.094.311-.152.1-.052.21-.108.33-.165.273-.13.572-.198.874-.201.26 0 .518.02.774.055.985.107 1.956.318 2.897.627.927.309 1.834.676 2.714 1.099l1.3.631.646.32c.157.086.359.163.578.247l.049.019c.238.092.457.188.695.307.13.066.253.14.371.224.113.091.22.189.32.293a6.987 6.987 0 0 1 1.001 1.398c.452.791.871 1.526 1.526 1.957l.458.302a.356.356 0 0 1-.032.073l-.096.179-.458.233a.394.394 0 0 0-.197.215.378.378 0 0 0-.027.133v.293c.002.155-.018.309-.06.458-.018.06-.04.113-.06.16a.503.503 0 0 0-.05.165.261.261 0 0 0 0 .142c.13.58 1.817 1.555 3.211 2.36.883.51 1.647.952 1.824 1.182ZM22.21 13.8c.05.636-.723 1.135-1.638 1.24-1.177.115-1.772-.53-1.639-1.345s-.44-.815-.824-.357a.064.064 0 0 1-.114-.046c.192-1.36.989-1.419 1.346-1.419 1.073.076 2.137.257 3.176.54a.161.161 0 0 1 .114.207.159.159 0 0 1-.05.072 1.153 1.153 0 0 0-.37 1.108Z" clip-rule="evenodd"/></svg>`

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
  injectedUI.innerHTML = `
  <div class="tally-ho-injected-wc-ui">
    <button>${tallyLogoSvg}Tally&nbsp;Ho!</button>
    <span>(i)You are seeing this because you have Tally Ho! installed.</span>
    <style>
      @font-face { 
        font-family: "Segment";
        font-weight: 100 400 500 900;
        font-style: normal italic;
        src: url(data:application/octet-stream;base64,${segmentB64})
      }

      .tally-ho-injected-wc-ui {
        all: unset;
        max-width: 400px;
        margin: 16px auto 0px;
        background: #F4F4F4;
        box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.05), 0px 8px 18px rgba(0, 0, 0, 0.05);
        border-radius: 12px;
        display: flex;
        justify-content: center;
        padding: 6px;
        gap: 16px;
        align-items: center;
      }
      
      .tally-ho-injected-wc-ui button {
        all: unset;
        font-family: 'Segment', 'Open Sans', sans-serif;
        font-style: normal;
        font-weight: 500;
        font-size: 20px;
        line-height: 24px;
        display: flex;
        align-items: center;
        color: #0D2321;
        background: #ED9A26;
        border-radius: 8px;
        padding: 5px 16px 5px 8px;
        gap: 4px;
        cursor: pointer;
      }

      .tally-ho-injected-wc-ui button:hover {
        background-color: #f0ac55;
        color: #013834;
      }

      .tally-ho-injected-wc-ui span {
        all: unset;
        font-family: 'Segment', 'Open Sans', sans-serif;
        font-style: normal;
        font-weight: 500;
        font-size: 14px;
        line-height: 18px;
        
        text-align: left;
        color: #588382;     
      }
    </style>
  </div>`

  const tallyButton = injectedUI.querySelector("button")
  if (tallyButton) {
    tallyButton.onclick = () => {
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
  ;(
    Object.keys(hostnameToHandler) as Array<keyof typeof hostnameToHandler>
  ).forEach((hostname) => {
    if (window.location.hostname.includes(hostname)) {
      observeMutations(hostnameToHandler[hostname])
    }
  })

  if (process.env.SUPPORT_WALLET_CONNECT === "true") {
    observeMutations(addTallyButtonForWalletConnectModal)
  }
}
