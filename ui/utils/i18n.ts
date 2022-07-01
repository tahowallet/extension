import browser from "webextension-polyfill"

export default function t(msg: string, params: string | string[] = ""): string {
  return browser.i18n.getMessage(msg, params) ?? ""
}
