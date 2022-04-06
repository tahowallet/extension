import Dexie from "dexie"
import { AddressOnNetwork } from "../../accounts"

export type ReferrerStats = {
  bonusTotal: bigint
  referredUsers: number
}

export class DoggoDatabase extends Dexie {
  private referralBonuses!: Dexie.Table<
    AddressOnNetwork & { referred: AddressOnNetwork; referralBonus: bigint },
    [string, string, string]
  >

  constructor() {
    super("tally/doggo")

    this.version(1).stores({
      referralBonuses: "&[address+network.name+network.chainID],address",
    })
  }

  async addReferralBonus(
    referrer: AddressOnNetwork,
    referred: AddressOnNetwork,
    bonus: bigint
  ): Promise<void> {
    this.referralBonuses.put({ ...referrer, referred, referralBonus: bonus })
  }

  async getReferrerStats({
    address,
    network,
  }: AddressOnNetwork): Promise<ReferrerStats> {
    const allReferrals = await this.referralBonuses
      .where({
        address,
        "network.name": network.name,
        "network.chainID": network.chainID,
      })
      .toArray()

    return {
      referredUsers: allReferrals.length,
      bonusTotal: allReferrals.reduce(
        (bonusTotal, { referralBonus }) => bonusTotal + referralBonus,
        0n
      ),
    }
  }
}

export async function getOrCreateDB(): Promise<DoggoDatabase> {
  return new DoggoDatabase()
}
