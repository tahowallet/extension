import Dexie from "dexie"

/**
 * An object describing a set of permissions granted to a given provider.
 * Generally tracked by dApp as part of DAppPermissions.
 */
export type ProviderPermissions = {
  allowedAccounts: string[]
}

type DAppPermissions = {
  dAppID: string
  permissions: ProviderPermissions
}

type Migration = {
  id: number
  appliedAt: number
}

export class ProviderBridgeServiceDatabase extends Dexie {
  private dAppPermissions!: Dexie.Table<DAppPermissions, string>

  private migrations!: Dexie.Table<Migration, number>

  constructor() {
    super("tally/provider-bridge-service")

    this.version(1).stores({
      migrations: "++id,appliedAt",
      dAppPermissions: "&dAppID,permissions.allowedAccounts",
    })
  }

  /**
   * Look up existing permissions for a given dAppID.
   */
  async getDAppPermissions(
    dAppID: string
  ): Promise<ProviderPermissions | undefined> {
    return this.dAppPermissions
      .get(dAppID)
      .then((result) => result?.permissions)
  }

  /**
   * Set or replace permissions for a given dAppID.
   */
  async setDAppPermissions(
    dAppID: string,
    permissions: ProviderPermissions
  ): Promise<string> {
    return this.dAppPermissions.put({
      dAppID,
      permissions,
    })
  }

  private async migrate() {
    const numMigrations = await this.migrations.count()
    if (numMigrations === 0) {
      await this.transaction("rw", this.migrations, async () => {
        this.migrations.add({ id: 0, appliedAt: Date.now() })
        // TODO decide migrations before the initial release
      })
    }
  }
}

export async function getOrCreateDB(): Promise<ProviderBridgeServiceDatabase> {
  const db = new ProviderBridgeServiceDatabase()

  // Call known-private migrate function, effectively treating it as
  // file-private.
  // eslint-disable-next-line @typescript-eslint/dot-notation
  await db["migrate"]()

  return db
}
