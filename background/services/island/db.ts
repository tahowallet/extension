import Dexie from "dexie"
import { AddressOnNetwork } from "../../accounts"
import { normalizeEVMAddress } from "../../lib/utils"

export type ReferrerStats = {
  bonusTotal: bigint
  referredUsers: number
}

export class IslandDatabase extends Dexie {
  private referralBonuses!: Dexie.Table<
    AddressOnNetwork & { referredBy: AddressOnNetwork; referralBonus: bigint },
    [string, string, string]
  >

  constructor() {
    super("taho/island")

    this.version(1).stores({
      referralBonuses:
        "&[address+referredBy.address+network.name+network.chainID],address,referredBy.address",
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
