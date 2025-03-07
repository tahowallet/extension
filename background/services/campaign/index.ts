import dayjs from "dayjs"
import isBetween from "dayjs/plugin/isBetween"
import browser from "webextension-polyfill"
import { isDisabled } from "../../features"
import { checkIsBorrowingTx } from "../../lib/mezo"
import AnalyticsService from "../analytics"
import BaseService from "../base"
import ChainService from "../chain"
import EnrichmentService from "../enrichment"
import NotificationsService from "../notifications"
import PreferenceService from "../preferences"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { CampaignDatabase, getOrCreateDB } from "./db"
import MEZO_CAMPAIGN, { MezoClaimStatus } from "./matsnet-nft"
import { isTransactionWithReceipt } from "../../networks"
import { Campaigns } from "./types"

dayjs.extend(isBetween)

interface Events extends ServiceLifecycleEvents {
  /**
   * Replaces UI state with active campaigns data
   */
  campaignStatusUpdate: Campaigns[]
}

export default class CampaignService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    CampaignService,
    [
      Promise<ChainService>,
      Promise<AnalyticsService>,
      Promise<PreferenceService>,
      Promise<EnrichmentService>,
      Promise<NotificationsService>,
    ]
  > = async (
    chainService,
    analyticsService,
    preferenceService,
    enrichmentService,
    notificationsService,
  ) =>
    new this(
      await getOrCreateDB(),
      await chainService,
      await analyticsService,
      await preferenceService,
      await enrichmentService,
      await notificationsService,
    )

  private constructor(
    private db: CampaignDatabase,
    private chainService: ChainService,
    private analyticsService: AnalyticsService,
    private preferenceService: PreferenceService,
    private enrichmentService: EnrichmentService,
    private notificationsService: NotificationsService,
  ) {
    super({
      checkMezoEligibility: {
        schedule: { delayInMinutes: 1, periodInMinutes: 60 },
        handler: () => this.checkMezoCampaignState(),
      },
    })
  }

  protected override async internalStartService(): Promise<void> {
    // Not correct but it's what spawned its existence
    if (isDisabled("SUPPORT_MEZO_NETWORK")) {
      return
    }

    this.enrichmentService.emitter.on(
      "enrichedEVMTransaction",
      async ({ transaction }) => {
        const campaignData = await this.db.getCampaignData(MEZO_CAMPAIGN.id)
        // Before snooping, check if we're at the right campaign state
        if (!campaignData || campaignData?.data?.state !== "can-borrow") {
          return
        }

        if (
          isTransactionWithReceipt(transaction) &&
          checkIsBorrowingTx(transaction)
        ) {
          await this.db.updateCampaignData(MEZO_CAMPAIGN.id, {
            state: "can-claim-nft",
          })

          this.emitter.emit(
            "campaignStatusUpdate",
            await this.db.getActiveCampaigns(),
          )
        }
      },
    )

    const campaigns = await this.db.getActiveCampaigns()
    this.emitter.emit("campaignStatusUpdate", campaigns)
  }

  async checkMezoCampaignState() {
    if (isDisabled("SUPPORT_MEZO_NETWORK")) {
      return
    }

    await this.started()
    const accounts = await this.chainService.getAccountsToTrack()
    // TODO: needs to be sent to API
    // const installId = await this.analyticsService.analyticsUUID

    const campaign = await this.db.getCampaignData(MEZO_CAMPAIGN.id)
    const lastKnownState = campaign?.data?.state

    if (
      !accounts.length ||
      (campaign && !campaign.enabled) ||
      lastKnownState === "campaign-complete" ||
      lastKnownState === "not-eligible"
    ) {
      return
    }

    const shownItems = new Set(
      await this.preferenceService.getShownDismissableItems(),
    )

    const hasSeenEligibilityPush = shownItems.has(
      MEZO_CAMPAIGN.notificationIds.eligible,
    )

    const hasSeenBorrowPush = shownItems.has(
      MEZO_CAMPAIGN.notificationIds.canBorrow,
    )

    const hasSeenNFTNotification = shownItems.has(
      MEZO_CAMPAIGN.notificationIds.canClaimNFT,
    )

    // fetch with uuid
    const campaignData = {
      dateFrom: "2025-02-21",
      dateTo: "2025-03-28",
      state: "eligible" as MezoClaimStatus,
    }

    if (campaignData.state === "not-eligible") {
      await this.db.upsertCampaign({
        id: MEZO_CAMPAIGN.id,
        data: undefined,
        enabled: false,
      })

      return
    }

    const isOngoing = dayjs().isBetween(
      campaignData.dateFrom,
      campaignData.dateTo,
      "day",
      "[]",
    )

    if (
      isOngoing &&
      campaignData.state === "eligible" &&
      !hasSeenEligibilityPush
    ) {
      this.notificationsService.notify({
        options: {
          title:
            "Enjoy 20,000 sats on Mezo testnet. Try borrow for an exclusive Mezo NFT!",
          message: "Login to Mezo to claim",
          onDismiss: () =>
            this.preferenceService.markDismissableItemAsShown(
              MEZO_CAMPAIGN.notificationIds.eligible,
            ),
        },
        callback: () => {
          browser.tabs.create({ url: "https://mezo.org/matsnet" })
          this.preferenceService.markDismissableItemAsShown(
            MEZO_CAMPAIGN.notificationIds.eligible,
          )
        },
      })
    }

    if (
      isOngoing &&
      campaignData.state === "can-borrow" &&
      !hasSeenBorrowPush
    ) {
      this.notificationsService.notify({
        options: {
          title: "Borrow mUSD with testnet sats for an exclusive Mezo NFT!",
          message: "Click to borrow mUSD ",
          onDismiss: () =>
            this.preferenceService.markDismissableItemAsShown(
              MEZO_CAMPAIGN.notificationIds.canBorrow,
            ),
        },
        callback: () => {
          browser.tabs.create({ url: "https://mezo.org/matsnet/borrow" })
          this.preferenceService.markDismissableItemAsShown(
            MEZO_CAMPAIGN.notificationIds.canBorrow,
          )
        },
      })
    }

    if (
      isOngoing &&
      campaignData.state === "can-claim-nft" &&
      !hasSeenNFTNotification
    ) {
      this.notificationsService.notify({
        options: {
          title:
            "Spend testnet mUSD in the Mezo store for an exclusive Mezo NFT!",
          message: "Click to visit the Mezo Store",
          onDismiss: () =>
            this.preferenceService.markDismissableItemAsShown(
              MEZO_CAMPAIGN.notificationIds.canClaimNFT,
            ),
        },
        callback: () => {
          browser.tabs.create({ url: "https://mezo.org/matsnet/borrow" })
          this.preferenceService.markDismissableItemAsShown(
            MEZO_CAMPAIGN.notificationIds.canClaimNFT,
          )
        },
      })
    }

    if (campaignData.state !== lastKnownState) {
      // If there was no campaign data create it
      if (!campaign) {
        await this.db.upsertCampaign({
          id: MEZO_CAMPAIGN.id,
          data: campaignData,
          enabled: true,
        })
      } else {
        await this.db.updateCampaignData(MEZO_CAMPAIGN.id, campaignData)
      }

      const campaigns = await this.db.getActiveCampaigns()
      this.emitter.emit("campaignStatusUpdate", campaigns)
    }
  }
}
