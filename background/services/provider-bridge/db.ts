import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import Dexie from "dexie"

type Migration = {
  id: number
  appliedAt: number
}

function keyBy(
  permissionsArray: Array<PermissionRequest>,
  key: keyof PermissionRequest
): Record<string, PermissionRequest> {
  return permissionsArray.reduce((acc, current) => {
    acc[current[key]] = current
    return acc
  }, {} as Record<string, PermissionRequest>)
}

export class ProviderBridgeServiceDatabase extends Dexie {
  private dAppPermissions!: Dexie.Table<PermissionRequest, string>

  private migrations!: Dexie.Table<Migration, number>

  constructor() {
    super("tally/provider-bridge-service")

    this.version(1).stores({
      migrations: "++id,appliedAt",
      dAppPermissions: "&origin,faviconUrl,title,state,accountAddress",
    })
  }

  async getAllPermission() {
    return this.dAppPermissions
      .toArray()
      .then((permissionsArray) => keyBy(permissionsArray, "origin"))
  }

  async setPermission(
    permission: PermissionRequest
  ): Promise<string | undefined> {
    return this.dAppPermissions.put(permission)
  }

  async deletePermission(origin: string) {
    return this.dAppPermissions.delete(origin)
  }

  async checkPermission(origin: string) {
    return this.dAppPermissions.get(origin)
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
