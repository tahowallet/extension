import Dexie from "dexie"
import { FunctionSignature } from "./types"
import { UNIXTime } from "../../types"

export type ResolvedFunctionSignature = FunctionSignature & {
  resolvedAt: UNIXTime
  dataSource: "4byte.directory"
}

export class EnrichmentDatabase extends Dexie {
  private functionSignatures!: Dexie.Table<ResolvedFunctionSignature, [string]>

  constructor() {
    super("tally/enrichment")
    this.version(1).stores({
      functionSignatures: "&selector,resolvedAt",
    })
  }

  async getFunctionSignature(
    selector: string
  ): Promise<ResolvedFunctionSignature | null> {
    return (
      (
        await this.functionSignatures
          .where("selector")
          .equals(selector)
          .toArray()
      )[0] ?? null
    )
  }

  async addOrUpdateFunctionSignature(
    functionSignature: FunctionSignature,
    dataSource: ResolvedFunctionSignature["dataSource"]
  ): Promise<void> {
    await this.transaction("rw", this.functionSignatures, () => {
      return this.functionSignatures.put({
        ...functionSignature,
        resolvedAt: Date.now(),
        dataSource,
      })
    })
  }
}

export async function getOrCreateDB(): Promise<EnrichmentDatabase> {
  return new EnrichmentDatabase()
}
