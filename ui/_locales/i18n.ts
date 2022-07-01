import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import EN from "./en/messages.json"

const resources = {
  en: {
    translation: EN,
  },
}

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: process.env.DEFAULT_LANG || "en",
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      bindI18n: "languageChanged",
    },
  })

export default i18n
