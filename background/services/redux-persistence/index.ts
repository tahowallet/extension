import browser from "webextension-polyfill"
import { decodeJSON } from "../../lib/utils"
import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { getOrCreateDB, ReduxPersistenceDatabase } from "./db"
import { migrateReduxState, REDUX_STATE_VERSION } from "./migrations"
import { StateContent } from "./types"

type Events = ServiceLifecycleEvents

async function loadLegacyState(): Promise<StateContent | null> {
  const { state: stateJson, version } = await browser.storage.local.get([
    "state",
    "version",
  ])

  if (stateJson === undefined) return null
  if (version !== undefined && typeof version !== "number") {
    throw new Error(`Unexpected persted state version: ${version}`)
  }

  const state = decodeJSON(stateJson)
  if (typeof state !== "object" || state === null) {
    throw new Error(`Unexpected JSON persisted for state: ${stateJson}`)
  }

  return { state: state as Record<string, unknown>, version }
}

export default class ReduxPersistenceService extends BaseService<Events> {
  static create: ServiceCreatorFunction<Events, ReduxPersistenceService, []> =
    async () => {
      return new this(await getOrCreateDB())
    }

  private constructor(private db: ReduxPersistenceDatabase) {
    super()
  }

  async loadState(): Promise<Record<string, unknown>> {
    const stateContent =
      (await this.db.loadState()) ?? (await loadLegacyState())
    if (stateContent === null) return {}
    const { state, version } = stateContent
    return migrateReduxState(state, version)
  }

  async saveState(state: Record<string, unknown>): Promise<void> {
    await this.db.saveState({ version: REDUX_STATE_VERSION, state })
  }
}
