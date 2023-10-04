import { BigNumber } from "ethers"
import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"
import { Eligible, ReferrerStats } from "./types"
import BaseService from "../base"
import { getFileHashProspect, getClaimFromFileHash } from "./utils"
import ChainService from "../chain"
import { DOGGO, ETHEREUM } from "../../constants"
import { sameNetwork } from "../../networks"
import {
  ClaimWithFriends,
  ISLAND_NETWORK,
  STARTING_REALM_NAMES,
  TESTNET_TAHO,
  TestnetTahoDeployer,
  buildRealmContract,
} from "./contracts"
import IndexingService from "../indexing"
import { initialVaults } from "../../redux-slices/earn"
import logger from "../../lib/logger"
import { HexString } from "../../types"
import { AddressOnNetwork } from "../../accounts"
import { IslandDatabase, getOrCreateDB } from "./db"
import { normalizeEVMAddress } from "../../lib/utils"
import { FeatureFlags, isDisabled, isEnabled } from "../../features"
import { SmartContractFungibleAsset } from "../../assets"

export {
  TESTNET_TAHO,
  VOTE_WITH_FRIENDS_ADDRESS,
  TestnetTahoDeployer as TahoDeployer,
} from "./contracts"

export { ReferrerStats } from "./types"

interface Events extends ServiceLifecycleEvents {
  newEligibility: Eligible
  newReferral: { referrer: AddressOnNetwork } & ReferrerStats
}

/*
 * The Island service handles interactions, caching, and indexing related to
 * the Island game and its capabilities.
 *
 * This includes handling Island contracts, as well as metadata that is best
 * maintained in-wallet around XP, etc.
 */
export default class IslandService extends BaseService<Events> {
  private isRelevantMonitoringEnabled = false

  static create: ServiceCreatorFunction<
    Events,
    IslandService,
    [Promise<ChainService>, Promise<IndexingService>]
  > = async (chainService, indexingService) =>
    new this(await getOrCreateDB(), await chainService, await indexingService)

  private constructor(
    private db: IslandDatabase,
    private chainService: ChainService,
    private indexingService: IndexingService,
  ) {
    super({
      startMonitoringIfNeeded: {
        schedule: {
          periodInMinutes: 10,
        },
        handler: () => this.startMonitoringIfNeeded,
        runAtStart: true,
      },
    })
  }

  private async startMonitoringIfNeeded(): Promise<void> {
    if (isDisabled(FeatureFlags.SUPPORT_THE_ISLAND_TESTNET)) {
      this.isRelevantMonitoringEnabled = true
      return
    }

    if (this.isRelevantMonitoringEnabled) {
      return
    }

    const islandProvider = this.chainService.providerForNetwork(ISLAND_NETWORK)
    if (islandProvider === undefined) {
      logger.debug(
        "No Arbitrum provider available, not setting up The Island...",
      )

      return
    }

    if (!this.indexingService.isTrackingAsset(TESTNET_TAHO)) {
      await this.indexingService.addAssetToTrack(TESTNET_TAHO)
    }

    const connectedDeployer = TestnetTahoDeployer.connect(islandProvider)
    await Promise.all(
      STARTING_REALM_NAMES.map(async (realmName) => {
        const realmAddress =
          await connectedDeployer.functions[
            `${realmName.toUpperCase()}_REALM`
          ]()
        const realmContract =
          buildRealmContract(realmAddress).connect(islandProvider)

        const xpAddress = await realmContract.functions.xp()
        const asset = await this.indexingService.addTokenToTrackByContract(
          ISLAND_NETWORK,
          xpAddress,
          { verified: true },
        )
      }),
    )

    // If all monitoring is enabled successfully, don't try again later.
    this.isRelevantMonitoringEnabled = true
  }

  protected override async internalStartService(): Promise<void> {
    await super.internalStartService()

    const huntingGrounds = initialVaults

    if (!isEnabled(FeatureFlags.HIDE_TOKEN_FEATURES)) {
      // Make sure the hunting ground assets are being tracked.
      huntingGrounds.forEach(({ network, asset }) => {
        this.indexingService.addAssetToTrack({
          ...asset,
          homeNetwork: network,
        })
      })
      this.indexingService.addAssetToTrack(DOGGO)

      this.indexingService.addAssetToTrack({
        contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        decimals: 18,
        homeNetwork: ETHEREUM,
        name: "Wrapped Ether",
        symbol: "WETH",
      })

      // Track referrals for all added accounts and any new ones that are added
      // after load.
      this.chainService.emitter.on("newAccountToTrack", (addressOnNetwork) => {
        this.trackReferrals(addressOnNetwork)
      })
      ;(await this.chainService.getAccountsToTrack()).forEach(
        (addressOnNetwork) => {
          this.trackReferrals(addressOnNetwork)
        },
      )
    }
  }

  protected override async internalStopService(): Promise<void> {
    await super.internalStopService()
  }

  async getEligibility(address: string): Promise<Eligible> {
    const fileHash = await getFileHashProspect(address)
    const { account, amount, index, proof } = await getClaimFromFileHash(
      address,
      fileHash,
    )

    const claim = {
      index,
      amount: BigInt(amount),
      account,
      proof,
    }
    this.emitter.emit("newEligibility", claim)
    return claim
  }

  /**
   * Returns the total users referred and the referral bonus total for the
   * given referrer. Only tracked for accounts that are being tracked by the
   * ChainService.
   */
  async getReferrerStats(referrer: AddressOnNetwork): Promise<ReferrerStats> {
    return this.db.getReferrerStats(referrer)
  }

  private async trackReferrals({
    address,
    network,
  }: AddressOnNetwork): Promise<void> {
    if (sameNetwork(network, ETHEREUM)) {
      const provider = this.chainService.providerForNetwork(ETHEREUM)

      if (provider === undefined) {
        return
      }

      const providedClaimWithFriends = ClaimWithFriends.connect(provider)
      const referralFilter = ClaimWithFriends.filters.ClaimedWithCommunityCode(
        null,
        address,
      )

      const referralHandler: Parameters<
        (typeof providedClaimWithFriends)["on"]
      >[1] = (...args) => {
        if (args.length !== 6) {
          logger.error(
            "Malformed event, got an unexpected number of ClaimedWithCommunityCode parameters:",
            args,
          )
          return
        }

        this.registerReferral(
          { address: normalizeEVMAddress(address), network },
          [args[0], args[1], args[2], args[3], args[4], args[5]],
        )
      }

      providedClaimWithFriends.on(referralFilter, referralHandler)
      ;(await providedClaimWithFriends.queryFilter(referralFilter)).forEach(
        (event) => {
          if (event.args === undefined) {
            logger.error(
              "Malformed event lookup, got no decoded ClaimedWithCommunityCode parameters:",
              event,
            )
            return
          }

          referralHandler(
            event.args.index,
            event.args.claimant,
            event.args.amountClaimed,
            event.args.claimedBonus,
            event.args.communityRef,
            event.args.communityBonus,
          )
        },
      )
    }
  }

  private async registerReferral(
    claimant: AddressOnNetwork,
    [, , , , communityRef, communityBonus]: [
      BigNumber,
      HexString,
      BigNumber,
      BigNumber,
      HexString,
      BigNumber,
    ],
  ): Promise<void> {
    const referrer = {
      address: normalizeEVMAddress(communityRef),
      network: claimant.network,
    }
    await this.db.addReferralBonus(
      claimant,
      referrer,
      communityBonus.toBigInt(),
    )

    // emit event to inform referrer that their referral link was used
    this.emitter.emit("newReferral", {
      referrer,
      ...(await this.getReferrerStats(referrer)),
    })
  }
}
