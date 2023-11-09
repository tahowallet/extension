import { uniqueId } from "lodash"
import BaseService from "../base"
import IslandService from "../island"
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
  private deliverNotifications = false

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
    [Promise<PreferenceService>, Promise<IslandService>]
  > = async (preferenceService, islandService) =>
    new this(await preferenceService, await islandService)

  private constructor(
    private preferenceService: PreferenceService,
    private islandService: IslandService,
  ) {
    super()
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    // Preference and listener setup.
    // NOTE: Below, we assume if we got `shouldShowNotifications` as true, the
    // browser notifications permission has been granted. The preferences service
    // does guard this, but if that ends up not being true, browser.notifications
    // will be undefined and all of this will explode.
    this.deliverNotifications =
      await this.preferenceService.getShouldShowNotifications()
    this.preferenceService.emitter.on(
      "updateShouldShowNotifications",
      ({ shouldShowNotifications }) => {
        this.deliverNotifications = shouldShowNotifications

        if (shouldShowNotifications) {
          browser.notifications.onClicked.addListener(
            this.handleNotificationClicks.bind(this),
          )
          browser.notifications.onClosed.addListener(
            this.cleanUpNotificationClickHandler.bind(this),
          )
        } else {
          browser.notifications.onClicked.removeListener(
            this.handleNotificationClicks.bind(this),
          )
          browser.notifications.onClosed.removeListener(
            this.cleanUpNotificationClickHandler.bind(this),
          )
        }
      },
    )

    if (this.deliverNotifications) {
      browser.notifications.onClicked.addListener(
        this.handleNotificationClicks.bind(this),
      )
      browser.notifications.onClosed.addListener(
        this.cleanUpNotificationClickHandler.bind(this),
      )
    }

    /*
     * FIXME add below
    this.islandService.emitter.on("xpDropped", this.notifyXpDrop.bind(this))
    */
  }

  protected async notifyDrop(/* xpInfos: XpInfo[] */): Promise<void> {
    this.notify("", "", "", () => {
      browser.tabs.create({
        url: "dapp url for realm claim, XpInfo must include realm id, ideally some way to communicate if the address is right as well",
      })
    })
  }

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
  protected async notify(
    title: string,
    message: string,
    contextMessage: string,
    clickAction?: () => void,
  ) {
    if (!this.deliverNotifications) {
      return
    }

    const notificationId = uniqueId("notification-")

    if (typeof clickAction === "function") {
      this.clickHandlers[notificationId] = clickAction

      await browser.notifications.create(notificationId, {
        type: "basic",
        title: "",
        message: "",
        contextMessage: "",
        isClickable: true,
      })
    } else {
      await browser.notifications.create({
        type: "basic",
        title: "",
        message: "",
        contextMessage: "",
      })
    }
  }
}
