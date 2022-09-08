export interface PropsWithMediumIcon {
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

export interface PropsWithSmallIcon {
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

export type PropsIcon =
  | { iconMedium?: never; iconSmall?: never }
  | PropsWithMediumIcon
  | PropsWithSmallIcon
