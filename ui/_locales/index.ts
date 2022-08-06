import EN from "./en/messages.json"
import zhHant from "./zh_Hant/messages.json"
import ptBR from "./pt_BR/messages.json"

const DEFAULT_LANGUAGE = "en"

interface ILang {
  title: string
}

const SUPPORT_LANGUAGES: { [id: string]: ILang } = {
  en: {
    title: "English",
  },
  zh_tw: {
    title: "中文(繁體)",
  },
  pt_br: {
    title: "Português",
  },
}

const getLanguage = (): string => DEFAULT_LANGUAGE

interface ILangOptions {
  value: string
  label: string
}

const getAvalableLanguages = (): ILangOptions[] =>
  Object.keys(SUPPORT_LANGUAGES).map((lang) => ({
    value: lang,
    label: SUPPORT_LANGUAGES[lang].title,
  }))

const getLanguageIndex = (): number =>
  Object.keys(SUPPORT_LANGUAGES).indexOf(getLanguage())

const resources = {
  en: {
    translation: EN,
  },
  zh_tw: {
    translation: zhHant,
  },
  pt_br: {
    translation: ptBR,
  },
}

export {
  DEFAULT_LANGUAGE,
  SUPPORT_LANGUAGES,
  getLanguage,
  getLanguageIndex,
  getAvalableLanguages,
  resources,
}

export default resources
