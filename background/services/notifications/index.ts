import { uniqueId } from "lodash"
import browser from "webextension-polyfill"
import BaseService from "../base"
import PreferenceService from "../preferences"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { HOUR } from "../../constants"

const TAHO_ICON_URL =
  "https://taho.xyz/icons/icon-144x144.png?v=41306c4d4e6795cdeaecc31bd794f68e"

type Events = ServiceLifecycleEvents & {
  notificationDisplayed: string
  notificationSuppressed: string
}

type NotificationClickHandler = (() => Promise<void>) | (() => void)

const NOTIFICATIONS_XP_DROP_THRESHOLD = 24 * HOUR

/**
 * The NotificationService manages all notifications for the extension. It is
 * charged both with managing the actual notification lifecycle (notification
 * delivery, dismissal, and reaction to clicks) and delivery (i.e., responding
 * to user preferences to deliver vs not deliver notifications), but also is
 * charged with actually creating the notifications themselves.
 *
 * Adding a new notification should involve connecting the appropriate event in
 * another service to a method in NotificationService that will generate the
 * corresponding notification. In that way, the NotificationService is more part
 * of the UI aspect of the extension than the background aspect, as it decides
 * on and creates user-visible content directly.
 */
export default class NotificationsService extends BaseService<Events> {
  private isPermissionGranted: boolean | null = null

  private clickHandlers: {
    [notificationId: string]: NotificationClickHandler
  } = {}

  private dismissHandlers: {
    [notificationId: string]: (id: string, byUser: boolean) => void
  } = {}

  private lastXpDropNotificationInMs?: number

  /*
   * Create a new NotificationsService. The service isn't initialized until
   * startService() is called and resolved.
   */
  static create: ServiceCreatorFunction<
    Events,
    NotificationsService,
    [Promise<PreferenceService>]
  > = async (preferenceService) => new this(await preferenceService)

  private constructor(private preferenceService: PreferenceService) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    const boundHandleNotificationClicks =
      this.handleNotificationClicks.bind(this)

    const boundHandleNotificationClose = this.handleNotificationClose.bind(this)

    // Preference and listener setup.
    // NOTE: Below, we assume if we got `shouldShowNotifications` as true, the
    // browser notifications permission has been granted. The preferences service
    // does guard this, but if that ends up not being true, browser.notifications
    // will be undefined and all of this will explode.

    this.isPermissionGranted =
      await this.preferenceService.getShouldShowNotificationsPreferences()

    this.preferenceService.emitter.on(
      "setNotificationsPermission",
      async (isPermissionGranted) => {
        this.isPermissionGranted = isPermissionGranted

        if (this.isPermissionGranted) {
          browser.notifications.onClicked.addListener(
            boundHandleNotificationClicks,
          )

          browser.notifications.onClosed.addListener(
            boundHandleNotificationClose,
          )
        } else {
          // CLear up notifications
          const notifications = await browser.notifications.getAll()

          Object.keys(notifications).forEach((id) => {
            this.clearNotification(id)
          })

          browser.notifications.onClicked.removeListener(
            boundHandleNotificationClicks,
          )

          browser.notifications.onClosed.removeListener(
            boundHandleNotificationClose,
          )
        }
      },
    )

    if (this.isPermissionGranted) {
      browser.notifications.onClicked.addListener(boundHandleNotificationClicks)
      browser.notifications.onClosed.addListener(boundHandleNotificationClose)
    }
  }

  // Fires the click handler for the given notification id.
  protected handleNotificationClicks(notificationId: string): void {
    this.clickHandlers?.[notificationId]()
  }

  // Clears the click handler for the given notification id.
  protected handleNotificationClose(
    notificationId: string,
    byUser: boolean,
  ): void {
    delete this.clickHandlers?.[notificationId]

    this.dismissHandlers?.[notificationId]?.(notificationId, byUser)

    delete this.dismissHandlers?.[notificationId]
  }

  clearNotification(id: string) {
    browser.notifications.clear(id)

    delete this.clickHandlers?.[id]
    delete this.dismissHandlers?.[id]
  }

  /**
   * Issues a notification with the given title, message, and context message.
   * The click action, if specified, will be fired when the user clicks on the
   * notification.
   */
  public notify({
    options,
    callback,
  }: {
    options: {
      title: string
      message: string
      contextMessage?: string
      type?: browser.Notifications.TemplateType
      onDismiss?: () => void
      customId?: string
    }
    callback?: () => void
  }) {
    if (!this.isPermissionGranted) {
      return
    }

    const {
      onDismiss = () => {},
      customId,
      ...createNotificationOptions
    } = options

    const notificationId = customId ?? uniqueId("notification-")

    const notificationOptions = {
      type: "basic" as browser.Notifications.TemplateType,
      iconUrl: TAHO_ICON_URL,
      ...createNotificationOptions,
    }

    if (typeof callback === "function") {
      this.clickHandlers[notificationId] = callback
    }

    this.dismissHandlers[notificationId] = onDismiss

    browser.notifications.create(notificationId, notificationOptions)
  }

  public notifyXPDrop(callback?: () => void): void {
    const shouldShowXpDropNotifications = this.lastXpDropNotificationInMs
      ? Date.now() >
        this.lastXpDropNotificationInMs + NOTIFICATIONS_XP_DROP_THRESHOLD
      : true

    if (shouldShowXpDropNotifications) {
      this.lastXpDropNotificationInMs = Date.now()
      const options = {
        title: "Weekly XP distributed",
        message: "Visit Subscape to see if you are eligible",
      }
      this.notify({ options, callback })
    }
  }
}
