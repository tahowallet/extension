import EN from "./en/messages.json"
import zhHant from "./zh_Hant/messages.json"
import ptBR from "./pt_BR/messages.json"

const DEFAULT_LANGUAGE: string = process.env.DEFAULT_LANGUAGE || "en"

interface ILang {
  title: string
}

const SUPPORT_LANGUAGES: { [id: string]: ILang } = {
  en: {
    title: "English",
  },
  zh_tw: {
    title: "中文(正體)",
  },
  pt_br: {
    title: "Português",
  },
}

const getLanguage = (): string => SUPPORT_LANGUAGES[DEFAULT_LANGUAGE]?.title

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

export { DEFAULT_LANGUAGE, getLanguage, resources }

export default resources
