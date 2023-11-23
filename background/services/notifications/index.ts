import { uniqueId } from "lodash"
import BaseService from "../base"
import PreferenceService from "../preferences"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"

type Events = ServiceLifecycleEvents & {
  notificationDisplayed: string
  notificationSuppressed: string
}

type NotificationClickHandler = (() => Promise<void>) | (() => void)

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

    const boundCleanUpNotificationClickHandler =
      this.cleanUpNotificationClickHandler.bind(this)

    // Preference and listener setup.
    // NOTE: Below, we assume if we got `shouldShowNotifications` as true, the
    // browser notifications permission has been granted. The preferences service
    // does guard this, but if that ends up not being true, browser.notifications
    // will be undefined and all of this will explode.
    this.isPermissionGranted =
      await this.preferenceService.getShouldShowNotifications()

    this.preferenceService.emitter.on(
      "setNotificationsPermission",
      (isPermissionGranted) => {
        if (typeof browser !== "undefined") {
          if (isPermissionGranted) {
            browser.notifications.onClicked.addListener(
              boundHandleNotificationClicks,
            )
            browser.notifications.onClosed.addListener(
              boundCleanUpNotificationClickHandler,
            )
          } else {
            browser.notifications.onClicked.removeListener(
              boundHandleNotificationClicks,
            )
            browser.notifications.onClosed.removeListener(
              boundCleanUpNotificationClickHandler,
            )
          }
        }
      },
    )

    if (this.isPermissionGranted) {
      browser.notifications.onClicked.addListener(boundHandleNotificationClicks)
      browser.notifications.onClosed.addListener(
        boundCleanUpNotificationClickHandler,
      )
    }

    /*
     * FIXME add below
    this.islandService.emitter.on("xpDropped", this.notifyXpDrop.bind(this))
    */
  }

  // TODO: uncomment when the XP drop is ready
  // protected async notifyDrop(/* xpInfos: XpInfo[] */): Promise<void> {
  //   const callback = () => {
  //     browser.tabs.create({
  //       url: "dapp url for realm claim, XpInfo must include realm id, ideally some way to communicate if the address is right as well",
  //     })
  //   }
  //   this.notify({ callback })
  // }

  // Fires the click handler for the given notification id.
  protected handleNotificationClicks(notificationId: string): void {
    this.clickHandlers?.[notificationId]()
  }

  // Clears the click handler for the given notification id.
  protected cleanUpNotificationClickHandler(notificationId: string): void {
    delete this.clickHandlers?.[notificationId]
  }

  /**
   * Issues a notification with the given title, message, and context message.
   * The click action, if specified, will be fired when the user clicks on the
   * notification.
   */
  public async notify({
    title = "",
    message = "",
    contextMessage = "",
    callback,
  }: {
    title?: string
    message?: string
    contextMessage?: string
    callback?: () => void
  }) {
    if (!this.isPermissionGranted) {
      return
    }
    const notificationId = uniqueId("notification-")

    await browser.notifications.create(notificationId, {
      type: "basic",
      title,
      message,
      contextMessage,
      isClickable: !!callback,
    })
  }
}
