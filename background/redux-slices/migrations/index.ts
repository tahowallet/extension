import to2 from "./to-2"
import to3 from "./to-3"
import to4 from "./to-4"
import to5 from "./to-5"
import to6 from "./to-6"
import to7 from "./to-7"
import to8 from "./to-8"
import to9 from "./to-9"
import to10 from "./to-10"
import to11 from "./to-11"
import to12 from "./to-12"
import to13 from "./to-13"
import to14 from "./to-14"
import to15 from "./to-15"
import to16 from "./to-16"
import to17 from "./to-17"
import to18 from "./to-18"
import to19 from "./to-19"
import to20 from "./to-20"
import to21 from "./to-21"
import to22 from "./to-22"
import to23 from "./to-23"
import to24 from "./to-24"
import to25 from "./to-25"
import to26 from "./to-26"
import to27 from "./to-27"
import to28 from "./to-28"
import to29 from "./to-29"
import to30 from "./to-30"
import to31 from "./to-31"
import to32 from "./to-32"
import to33 from "./to-33"
import to34 from "./to-34"
import to35 from "./to-35"
import to36 from "./to-36"

/**
 * The version of persisted Redux state the extension is expecting. Any previous
 * state without this version, or with a lower version, ought to be migrated.
 */
export const REDUX_STATE_VERSION = 36

/**
 * Common type for all migration functions.
 */
type Migration = (prevState: Record<string, unknown>) => Record<string, unknown>

// An object mapping a version number to a state migration. Each migration for
// version n is expected to take a state consistent with version n-1, and return
// state consistent with version n.
const allMigrations: { [targetVersion: string]: Migration } = {
  2: to2,
  3: to3,
  4: to4,
  5: to5,
  6: to6,
  7: to7,
  8: to8,
  9: to9,
  10: to10,
  11: to11,
  12: to12,
  13: to13,
  14: to14,
  15: to15,
  16: to16,
  17: to17,
  18: to18,
  19: to19,
  20: to20,
  21: to21,
  22: to22,
  23: to23,
  24: to24,
  25: to25,
  26: to26,
  27: to27,
  28: to28,
  29: to29,
  30: to30,
  31: to31,
  32: to32,
  33: to33,
  34: to34,
  35: to35,
  36: to36,
}

/**
 * Migrate a previous version of the Redux state to that expected by the current
 * code base.
 */
export function migrateReduxState(
  previousState: Record<string, unknown>,
  previousVersion?: number,
): Record<string, unknown> {
  const resolvedVersion = previousVersion ?? 1
  let migratedState: Record<string, unknown> = previousState

  if (resolvedVersion < REDUX_STATE_VERSION) {
    const outstandingMigrations = Object.entries(allMigrations)
      .sort()
      .filter(([version]) => parseInt(version, 10) > resolvedVersion)
      .map(([, migration]) => migration)
    migratedState = outstandingMigrations.reduce(
      (state: Record<string, unknown>, migration: Migration) =>
        migration(state),
      migratedState,
    )
  }

  return migratedState
}

export default allMigrations
