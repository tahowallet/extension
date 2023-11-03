import browser from "webextension-polyfill"
import { AllowedQueryParamPageType } from "@tallyho/provider-bridge-shared"

/**
 * Shows an extension popup with the given URL, which should be one of the URLs
 * that can be passed to the extension as a starting point. Additional options
 * can be passed to the query string where relevant, and an `onClose` callback
 * can be provided that will be invoked when the given popup window is closed.
 */
export default async function showExtensionPopup(
  url: AllowedQueryParamPageType,
  additionalOptions: { [key: string]: string } = {},
  onClose?: () => void,
): Promise<browser.Windows.Window> {
  const { left = 0, top, width = 1920 } = await browser.windows.getCurrent()
  const popupWidth = 384
  const popupHeight = 628

  const queryString = new URLSearchParams({
    ...additionalOptions,
    page: url,
  }).toString()

  const params: browser.Windows.CreateCreateDataType = {
    url: `${browser.runtime.getURL("popup.html")}?${queryString}`,
    type: "popup",
    left: left + width - popupWidth,
    top,
    width: popupWidth,
    height: popupHeight,
    focused: true,
  }

  const window = await browser.windows.create(params)

  if (onClose !== undefined) {
    const listener = (windowId: number) => {
      if (windowId === window.id) {
        onClose()

        browser.windows.onRemoved.removeListener(listener)
      }
    }
    browser.windows.onRemoved.addListener(listener)
  }

  return window
}
