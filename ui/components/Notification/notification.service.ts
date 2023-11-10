type NotificationPermission = "default" | "denied" | "granted" | null

class NotificationService {
  #permission: NotificationPermission

  static #instance: NotificationService

  constructor() {
    this.#permission = Notification.permission
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

  private set permission(permission: NotificationPermission) {
    this.#permission = permission
  }

  public get permission() {
    return this.#permission
  }

  public pushNotification = ({
    title,
    options,
  }: {
    title: string
    options?: NotificationOptions
  }): Notification | undefined => {
    if (this.#permission === "granted") {
      return new Notification(title, options)
    }
    return undefined
  }

  public requestPermission = () =>
    new Promise<boolean>((resolve) => {
      if (this.#permission !== "granted") {
        chrome.permissions.request(
          {
            permissions: ["notifications"],
          },
          (granted) => {
            if (granted) {
              this.#permission = "granted"
            } else {
              this.#permission = "denied"
            }
            resolve(granted)
          },
        )
      }
    })

  public cancelPermission = () =>
    new Promise<boolean>((resolve) => {
      chrome.permissions.remove(
        { permissions: ["notifications"] },
        (removed) => {
          if (removed) {
            this.#permission = null
          }
          resolve(removed)
        },
      )
    })
}

export default NotificationService.instance
