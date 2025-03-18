import dayjs from "dayjs"
import isBetween from "dayjs/plugin/isBetween"
import browser from "webextension-polyfill"
import { fetchJson } from "@ethersproject/web"
import { isDisabled } from "../../features"
import { checkIsBorrowingTx, checkIsMintTx } from "../../lib/mezo"
import AnalyticsService from "../analytics"
import BaseService from "../base"
import ChainService from "../chain"
import EnrichmentService from "../enrichment"
import NotificationsService from "../notifications"
import PreferenceService from "../preferences"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { CampaignDatabase, getOrCreateDB } from "./db"
import MEZO_CAMPAIGN, { MezoClaimStatus } from "./matsnet-nft"
import { isConfirmedEVMTransaction } from "../../networks"
import { Campaigns } from "./types"
import logger from "../../lib/logger"
import { AnalyticsEvent } from "../../lib/posthog"
import { SECOND } from "../../constants"

dayjs.extend(isBetween)

interface Events extends ServiceLifecycleEvents {
  /**
   * Replaces UI state with active campaigns data
   */
  campaignStatusUpdate: Campaigns[]
  /**
   * Emitted after a campaign status is checked
   */
  campaignChecked: string
}

export default class CampaignService extends BaseService<Events> {
  #checkCampaignStateTimer: ReturnType<typeof setTimeout> | null = null

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
        handler: () => this.queuedMezoCampaignCheck(),
      },
    })
  }

  private queuedMezoCampaignCheck() {
    // If there's already a queued check do nothing
    if (this.#checkCampaignStateTimer) return

    this.#checkCampaignStateTimer = setTimeout(() => {
      this.#checkCampaignStateTimer = null

      this.checkMezoCampaignState().then(() => {
        this.emitter.emit("campaignChecked", MEZO_CAMPAIGN.id)
      })
    }, 10 * SECOND)
  }

  protected override async internalStartService(): Promise<void> {
    // Not correct but it's what spawned its existence
    if (isDisabled("SUPPORT_MEZO_NETWORK")) {
      return
    }

    // If it's the first account the user onboards queue a campaign status check
    // Note: This could happen if user has an eligible wallet install but
    // removed all accounts
    this.chainService.emitter.on("newAccountToTrack", async () => {
      const trackedAccounts = await this.chainService.getAccountsToTrack()
      if (trackedAccounts.length === 1) {
        this.queuedMezoCampaignCheck()
      }
    })

    this.enrichmentService.emitter.on(
      "enrichedEVMTransaction",
      async ({ transaction }) => {
        const campaignData = await this.db.getCampaignData(MEZO_CAMPAIGN.id)
        // Before snooping, check if we're at the right campaign state
        if (
          !campaignData ||
          (campaignData?.data?.state !== "can-borrow" &&
            campaignData?.data?.state !== "can-claim-nft")
        ) {
          return
        }

        if (
          campaignData.data.state === "can-borrow" &&
          isConfirmedEVMTransaction(transaction) &&
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

        if (
          campaignData.data.state === "can-claim-nft" &&
          isConfirmedEVMTransaction(transaction) &&
          checkIsMintTx(transaction)
        ) {
          await this.db.updateCampaignData(MEZO_CAMPAIGN.id, {
            state: "campaign-complete",
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

  // This should only be called during dapp connection
  async checkMezoSatsDrop(address: string) {
    const campaign = await this.db.getCampaignData(MEZO_CAMPAIGN.id)

    // if the wallet has just initialized and we haven't had a chance to fetch campaign state
    // queue a status check and retry after it completes
    if (!campaign) {
      this.queuedMezoCampaignCheck()

      this.emitter.once("campaignChecked").then((campaignId) => {
        if (campaignId === MEZO_CAMPAIGN.id) {
          this.checkMezoSatsDrop(address)
        }
      })

      return
    }

    const lastKnownState = campaign?.data?.state

    // Only check sats drop if wallet is at 'eligible' state
    if (lastKnownState === "eligible") {
      const uri = new URL(
        "https://portal.api.test.mezo.org/api/v2/external/campaigns/mezoification/check-drop",
      )

      const installId = this.analyticsService.analyticsUUID

      uri.searchParams.set("id", installId)
      uri.searchParams.set("address", address)

      await fetchJson(uri.toString()).catch((error) =>
        logger.error("Error while checking Mezo sats drop", error),
      )

      // Queue another status check so we update the campaign state
      // API will check if user has already borrowed
      this.queuedMezoCampaignCheck()
    }
  }

  // This isn't meant to be called directly but rather, through queuedMezoCampaignCheck
  private async checkMezoCampaignState() {
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
          this.analyticsService.sendAnalyticsEvent(
            AnalyticsEvent.CAMPAIGN_MEZO_NFT_ELIGIBLE_BANNER,
          )
          browser.tabs.create({
            url: "https://mezo.org/matsnet/borrow?src=taho-claim-sats-banner",
          })
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
          this.analyticsService.sendAnalyticsEvent(
            AnalyticsEvent.CAMPAIGN_MEZO_NFT_BORROW_BANNER,
          )
          browser.tabs.create({
            url: "https://mezo.org/matsnet/borrow?src=taho-borrow-banner",
          })
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
          this.analyticsService.sendAnalyticsEvent(
            AnalyticsEvent.CAMPAIGN_MEZO_NFT_CLAIM_NFT_BANNER,
          )
          browser.tabs.create({
            url: "https://mezo.org/matsnet/store?src=taho-claim-nft-banner",
          })
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
