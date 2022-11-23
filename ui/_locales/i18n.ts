import i18n from "i18next"
import { initReactI18next, TFuncKey, TFuncReturn } from "react-i18next"
import { resources } from "./index"
import { getLocalStorageItem, setLocalStorageItem } from "../hooks"

const LANGUAGE_KEY = "lang"
const DEFAULT_LANGUAGE = "en"

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: getLocalStorageItem(LANGUAGE_KEY, DEFAULT_LANGUAGE),
    fallbackLng: DEFAULT_LANGUAGE,
    debug: false,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      bindI18n: "languageChanged",
    },
  })

const getLanguage = (): string => i18n.language
const setLanguage = (lang: string): void => {
  i18n
    .changeLanguage(lang)
    .then(() => lang && setLocalStorageItem(LANGUAGE_KEY, lang))
}

declare module "react-i18next" {
  interface CustomTypeOptions {
    resources: typeof resources["en"]
  }
}

type ValidKeys<Dict> = {
  [k in keyof Dict]: Dict[k] extends string ? k : never
}[keyof Dict]

export type I18nKey = ValidKeys<{
  [k in TFuncKey]: TFuncReturn<"translation", k, null> extends string ? k : null
}>

export { i18n, getLanguage, setLanguage }

export default i18n
