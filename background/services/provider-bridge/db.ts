import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import Dexie from "dexie"

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

  constructor() {
    super("tally/provider-bridge-service")

    this.version(1).stores({
      migrations: "++id,appliedAt",
      dAppPermissions: "&origin,faviconUrl,title,state,accountAddress",
    })

    // This is my penance for designing a database schema in a release crunch
    // without fully understanding the constraints of indexedDb
    // The problem is that it's not possible to change the primary key on an existing db
    //  -v2: create Tmp table and copy everything over
    //  -v3: delete main table
    //  -v4: recreate main table with the correct primary key and copy the data
    //  -v5: delete temp table
    const tempTable = "dAppPermissionsTemp"
    const mainTable = "dAppPermissions"

    this.version(2)
      .stores({
        migrations: null,
        [tempTable]: "&[origin+accountAddress],origin,accountAddress",
      })
      .upgrade((tx) => {
        return tx
          .table(mainTable)
          .toArray()
          .then((permissions) => tx.table(tempTable).bulkAdd(permissions))
      })

    this.version(3).stores({
      [mainTable]: null,
    })

    this.version(4)
      .stores({
        [mainTable]: "&[origin+accountAddress],origin,accountAddress",
      })
      .upgrade((tx) => {
        return tx
          .table(tempTable)
          .toArray()
          .then((permissions) => tx.table(mainTable).bulkAdd(permissions))
      })

    this.version(5).stores({
      [tempTable]: null,
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
}

export async function getOrCreateDB(): Promise<ProviderBridgeServiceDatabase> {
  return new ProviderBridgeServiceDatabase()
}
