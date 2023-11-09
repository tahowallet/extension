import Dexie from "dexie"
import { current } from "immer"
import { AddressOnNetwork } from "../../accounts"
import { normalizeEVMAddress } from "../../lib/utils"
import { ReferrerStats } from "./types"
import { HexString } from "../../types"

type Realm = {
  addressOnNetwork: AddressOnNetwork
  name: string
}

type XpClaim = {
  transactionHash: HexString
  amount: bigint
}

type RealmMembership = {
  trackedAccount: AddressOnNetwork
  realm: Realm
  xpClaims: XpClaim[]
  currentlyActive: boolean
}

export class IslandDatabase extends Dexie {
  private referralBonuses!: Dexie.Table<
    AddressOnNetwork & { referredBy: AddressOnNetwork; referralBonus: bigint },
    [string, string, string]
  >

  private realmMembership!: Dexie.Table<RealmMembership, [HexString, HexString]>

  constructor() {
    super("taho/island")

    this.version(1).stores({
      referralBonuses:
        "&[address+referredBy.address+network.name+network.chainID],address,referredBy.address",
    })

    /*this.version(2).stores({
      realmMembership:
        "&[trackedAccount.address,realm.addressOnNetwork.address]",
    })*/
  }

  /**
   * Records a membership for the given account in the given realm. The
   * membership is added as currently active by default, but this can be set to
   * `false` if recording a historic realm memberhsip.
   */
  async addRealmMembership(
    trackedAccount: AddressOnNetwork,
    realm: Realm,
    currentlyActive = false,
  ): Promise<void> {
    this.realmMembership.add({
      trackedAccount,
      realm,
      xpClaims: [],
      currentlyActive,
    })
  }

  /**
   * Clears any realm membership marked as active for the given account. Note
   * that typically there should only ever be one realm marked as active, and
   * it should be updated using `markRealmMembershipInactive`.
   */
  async clearActiveRealmMemberships(
    trackedAccount: AddressOnNetwork,
  ): Promise<void> {
    const activeMemberships = await this.realmMembership
      .where({
        trackedAccount: { address: trackedAccount.address },
        currentlyActive: true,
      })
      .toArray()

    await this.realmMembership.bulkPut(
      activeMemberships.map((membership) => ({
        ...membership,
        currentlyActive: false,
      })),
    )
  }

  /**
   * Marks the given realm to be active for the given account. Clears any other
   * active realm.
   */
  async markRealmMembershipActive(
    trackedAccount: AddressOnNetwork,
    realm: Realm,
  ): Promise<void> {
    this.realmMembership.update(
      [trackedAccount.address, realm.addressOnNetwork.address],
      {
        currentlyActive: true,
      },
    )
  }

  /**
   * Marks the given realm to be inactive for the given account.
   */
  async markRealmMembershipInactive(
    trackedAccount: AddressOnNetwork,
    realm: Realm,
  ): Promise<void> {
    this.realmMembership.update(
      [trackedAccount.address, realm.addressOnNetwork.address],
      {
        currentlyActive: false,
      },
    )
  }

  /**
   * Returns all realm memberships for the given account. Note that this can
   * include historic memberships if the account has joined and left more than
   * one realm in the past, or if they joined a realm but are not currently in
   * it.
   */
  async getRealmMembershipsFor(
    trackedAccount: AddressOnNetwork,
  ): Promise<RealmMembership[]> {
    return this.realmMembership.where({ trackedAccount }).toArray()
  }

  /**
   * Adds an XP claim for the given realm and tracked account. The XP claim
   * represents a transaction that claimed XP, and the amount of XP that was
   * claimed.
   */
  async addXpClaim(
    trackedAccount: AddressOnNetwork,
    realm: Realm,
    claim: XpClaim,
  ): Promise<void> {
    const existingRealmMembership = (await this.realmMembership.get([
      trackedAccount.address,
      realm.addressOnNetwork.address,
    ])) ?? { trackedAccount, realm, xpClaims: [], currentlyActive: false }

    // Upsert in case we weren't previously tracking this membership for some
    // reason.
    await this.realmMembership.put({
      ...existingRealmMembership,
      xpClaims: [...existingRealmMembership.xpClaims, claim],
    })
  }

  async addReferralBonus(
    claimant: AddressOnNetwork,
    referredBy: AddressOnNetwork,
    bonus: bigint,
  ): Promise<void> {
    this.referralBonuses.put({ ...claimant, referredBy, referralBonus: bonus })
  }

  async getReferrerStats({
    address,
    network,
  }: AddressOnNetwork): Promise<ReferrerStats> {
    const allReferrals = await this.referralBonuses
      .where("referredBy.address")
      .equals(normalizeEVMAddress(address))
      .filter(
        ({ network: claimantNetwork }) =>
          claimantNetwork.name === network.name &&
          claimantNetwork.chainID === network.chainID,
      )
      .toArray()

    return {
      referredUsers: allReferrals.length,
      bonusTotal: allReferrals.reduce(
        (bonusTotal, { referralBonus }) => bonusTotal + referralBonus,
        0n,
      ),
    }
  }
}

export async function getOrCreateDB(): Promise<IslandDatabase> {
  return new IslandDatabase()
}
