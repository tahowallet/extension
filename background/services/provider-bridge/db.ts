import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import Dexie from "dexie"
import { ETHEREUM, POLYGON } from "../../constants"
import { keyPermissionsByChainIdAddressOrigin, PermissionMap } from "./utils"

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

    this.version(6)
      .stores({
        [mainTable]: "&[origin+accountAddress],origin,accountAddress,chainID",
      })
      .upgrade(async (tx) =>
        tx
          .table(mainTable)
          .toCollection()
          .modify((permission) => {
            // param reassignment is the recommended way to use `modify` https://dexie.org/docs/Collection/Collection.modify()
            // eslint-disable-next-line no-param-reassign
            permission.chainID = ETHEREUM.chainID
          })
      )

    this.version(7)
      .stores({
        migrations: null,
        [tempTable]: "&[origin+accountAddress],origin,accountAddress,chainID",
      })
      .upgrade((tx) => {
        return tx
          .table(mainTable)
          .toArray()
          .then((rows) => tx.table(tempTable).bulkAdd(rows))
      })

    this.version(8).stores({
      [mainTable]: null,
    })

    this.version(9)
      .stores({
        [mainTable]:
          "&[origin+accountAddress+chainID],origin,accountAddress,chainID",
      })
      .upgrade(async (tx) => {
        await tx
          .table(tempTable)
          .toArray()
          .then((rows) => tx.table(mainTable).bulkAdd(rows))

        const allPermission = await tx.table(mainTable).toArray()
        await Promise.all(
          allPermission.map(async (permission) => {
            await tx.table(mainTable).put({
              ...permission,
              chainID: POLYGON.chainID,
            })
          })
        )
      })

    this.version(10).stores({
      [tempTable]: null,
    })
  }

  async getAllPermission(): Promise<PermissionMap> {
    const permissions = await this.dAppPermissions.toArray()

    return keyPermissionsByChainIdAddressOrigin(permissions)
  }

  async setPermission(
    permission: PermissionRequest
  ): Promise<string | undefined> {
    return this.dAppPermissions.put(permission)
  }

  async deletePermission(
    origin: string,
    accountAddress: string,
    chainID: string
  ): Promise<number> {
    return this.dAppPermissions
      .where({ origin, accountAddress, chainID })
      .delete()
  }

  async deletePermissionByAddress(accountAddress: string): Promise<number> {
    return this.dAppPermissions.where({ accountAddress }).delete()
  }

  async checkPermission(
    origin: string,
    accountAddress: string,
    chainID: string
  ): Promise<PermissionRequest | undefined> {
    return this.dAppPermissions.get({ origin, accountAddress, chainID })
  }
}

export async function getOrCreateDB(): Promise<ProviderBridgeServiceDatabase> {
  return new ProviderBridgeServiceDatabase()
}
