type NotificationPermission = "default" | "denied" | "granted" | null

class NotificationService {
  #isNotificationSupported: boolean

  #permission: NotificationPermission

  static #instance: NotificationService

  constructor() {
    this.#isNotificationSupported = "Notification" in window
    this.#permission = this.#isNotificationSupported
      ? Notification.permission
      : null
  }

  static get instance() {
    if (!this.#instance) {
      this.#instance = new NotificationService()
    }
    return this.#instance
  }

  static log(log: string) {
    // eslint-disable-next-line no-console
    console.log(`%c${log}`, "color: red")
  }

  public set permission(permission: NotificationPermission) {
    this.#permission = permission
  }

  public get permission() {
    return this.#permission
  }

  public pushNotification({
    title,
    options,
  }: {
    title: string
    options?: NotificationOptions
  }): Notification | undefined {
    if (this.#permission === "granted") {
      return new Notification(title, options)
    }
    if (this.#permission !== "denied") {
      this.requestPermission()
    }
    return undefined
  }

  public requestPermission() {
    if (this.#isNotificationSupported) {
      Notification.requestPermission().then(
        (permission: NotificationPermission) => {
          this.#permission = permission
          this.pushNotification({
            title: "Welcome in Subscape, Nomad!",
            options: { body: `Your notificaition status: ${permission}}` },
          })
        },
      )
    } else {
      NotificationService.log(
        "This browser does not support desktop notification",
      )
    }
  }

  public cancelPermission() {
    if (this.#permission === "granted") {
      browser.permissions.remove({ permissions: ["notifications"] })
    }
  }
}

export default NotificationService.instance
