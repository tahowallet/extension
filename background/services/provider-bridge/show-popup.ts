import browser from "webextension-polyfill"
import { AllowedQueryParamPageType } from "@tallyho/provider-bridge-shared"

export default async function showExtensionPopup(
  url: AllowedQueryParamPageType,
  additionalOptions: { [key: string]: string } = {},
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

  return browser.windows.create(params)
}
