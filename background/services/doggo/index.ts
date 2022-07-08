import { BigNumber } from "ethers"
import { ServiceLifecycleEvents, ServiceCreatorFunction } from "../types"
import { Eligible } from "./types"
import BaseService from "../base"
import { getFileHashProspect, getClaimFromFileHash } from "./utils"
import ChainService from "../chain"
import { DOGGO, ETHEREUM } from "../../constants"
import { sameNetwork } from "../../networks"
import { ClaimWithFriends } from "./contracts"
import IndexingService from "../indexing"
import { initialVaults } from "../../redux-slices/earn"
import logger from "../../lib/logger"
import { HexString } from "../../types"
import { AddressOnNetwork } from "../../accounts"
import { DoggoDatabase, getOrCreateDB, ReferrerStats } from "./db"
import { normalizeEVMAddress } from "../../lib/utils"
import { HIDE_TOKEN_FEATURES } from "../../features"

interface Events extends ServiceLifecycleEvents {
  newEligibility: Eligible
  newReferral: { referrer: AddressOnNetwork } & ReferrerStats
}

/*
 * The DOGGO service handles interactions, caching, and indexing related to the
 * DOGGO token and its capabilities.
 *
 * This includes handling DOGGO claim data, as well as
 */
export default class DoggoService extends BaseService<Events> {
  static create: ServiceCreatorFunction<
    Events,
    DoggoService,
    [Promise<ChainService>, Promise<IndexingService>]
  > = async (chainService, indexingService) => {
    return new this(
      await getOrCreateDB(),
      await chainService,
      await indexingService
    )
  }

  private constructor(
    private db: DoggoDatabase,
    private chainService: ChainService,
    private indexingService: IndexingService
  ) {
    super()
  }

  protected async internalStartService(): Promise<void> {
    await super.internalStartService()

    const huntingGrounds = initialVaults

    const ethereumProvider = this.chainService.providerForNetwork(ETHEREUM)
    if (ethereumProvider === undefined) {
      logger.error(
        "No Ethereum provider available, not setting up DOGGO monitoring..."
      )
    }

    if (!HIDE_TOKEN_FEATURES) {
      // Make sure the hunting ground assets are being tracked.
      huntingGrounds.forEach(({ network, asset }) => {
        this.indexingService.addAssetToTrack({ ...asset, homeNetwork: network })
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
        }
      )
    }
  }

  protected async internalStopService(): Promise<void> {
    await super.internalStopService()
  }

  async getEligibility(address: string): Promise<Eligible> {
    const fileHash = await getFileHashProspect(address)
    const { account, amount, index, proof } = await getClaimFromFileHash(
      address,
      fileHash
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
        address
      )

      const referralHandler: Parameters<
        typeof providedClaimWithFriends["on"]
      >[1] = (...args) => {
        if (args.length !== 6) {
          logger.error(
            "Malformed event, got an unexpected number of ClaimedWithCommunityCode parameters:",
            args
          )
          return
        }

        this.registerReferral(
          { address: normalizeEVMAddress(address), network },
          [args[0], args[1], args[2], args[3], args[4], args[5]]
        )
      }

      providedClaimWithFriends.on(referralFilter, referralHandler)
      ;(await providedClaimWithFriends.queryFilter(referralFilter)).forEach(
        (event) => {
          if (event.args === undefined) {
            logger.error(
              "Malformed event lookup, got no decoded ClaimedWithCommunityCode parameters:",
              event
            )
            return
          }

          referralHandler(
            event.args.index,
            event.args.claimant,
            event.args.amountClaimed,
            event.args.claimedBonus,
            event.args.communityRef,
            event.args.communityBonus
          )
        }
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
      BigNumber
    ]
  ): Promise<void> {
    const referrer = {
      address: normalizeEVMAddress(communityRef),
      network: claimant.network,
    }
    await this.db.addReferralBonus(
      claimant,
      referrer,
      communityBonus.toBigInt()
    )

    // emit event to inform referrer that their referral link was used
    this.emitter.emit("newReferral", {
      referrer,
      ...(await this.getReferrerStats(referrer)),
    })
  }
}
