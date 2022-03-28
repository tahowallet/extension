import Dexie from "dexie"
import { StateContent } from "./types"

type CurrentStateKey = "current"

interface StateSnapshot extends StateContent {
  id: CurrentStateKey
  timestamp: Date
}

export class ReduxPersistenceDatabase extends Dexie {
  private snapshots!: Dexie.Table<StateSnapshot, CurrentStateKey>

  constructor() {
    super("tally/redux-persistence")
    this.version(1).stores({ snapshots: "&id" })
  }

  async saveState({ version, state }: StateContent): Promise<void> {
    await this.snapshots.put({
      id: "current",
      timestamp: new Date(),
      version,
      state,
    })
  }

  async loadState(): Promise<StateContent | null> {
    const snapshot = await this.snapshots.get("current")
    if (snapshot === undefined) return null
    const { version, state } = snapshot
    return { version, state }
  }
}

export async function getOrCreateDB(): Promise<ReduxPersistenceDatabase> {
  return new ReduxPersistenceDatabase()
}
