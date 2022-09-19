interface PropsWithMediumIcon {
  iconMedium?:
    | "connected"
    | "continue"
    | "copy"
    | "dark"
    | "dashboard"
    | "developer"
    | "disconnect"
    | "earn"
    | "export"
    | "eye-off"
    | "eye-on"
    | "feedback"
    | "gift"
    | "import"
    | "info"
    | "light"
    | "list"
    | "lock"
    | "un-lock"
    | "menu"
    | "new-tab"
    | "notif-accouncement"
    | "notif-attention"
    | "notif-correct"
    | "notif-wrong"
    | "search"
    | "swap"
    | "switch"
    | "wallet"
    | "discord"
    | "github"
  iconSmall?: never
}

interface PropsWithSmallIcon {
  iconSmall?:
    | "add"
    | "arrow-right"
    | "back"
    | "close"
    | "continue"
    | "copy"
    | "discord"
    | "download"
    | "dropdown"
    | "edit"
    | "garbage"
    | "lock"
    | "un-lock"
    | "mark-read"
    | "new-tab"
    | "notif-announ"
    | "notif-attention"
    | "notif-correct"
    | "notif-wrong"
    | "notification"
    | "receive"
    | "send"
    | "settings"
    | "swap"
  iconMedium?: never
}

export type PropsWithIcon =
  | { iconMedium?: never; iconSmall?: never }
  | PropsWithMediumIcon
  | PropsWithSmallIcon

/**
 * Simplifies type hints
 */
export type Simplify<T> = { [k in keyof T]: T[k] }
