/*

!******----------------------------------------*******!
!******* mostly just an example of a migration *******!
!******----------------------------------------*******!


this just provides a version state object with version 0
if their is no state
*/

// TODO We'll want to make default state dynamically resolvable due to the
// usual issues with historic migrations out of step with an evolving codebase.
// Alternatively, we can otherwise constrain migrations to "freeze" data shapes
import { DEFAULT_STATE } from "../constants/default-state"

const version = 0

// Disable until we decide what to do here; probably rename file to v0.ts and
// make this the default export.
// eslint-disable-next-line import/prefer-default-export
export const v0 = {
  version,
  migration,
}

async function migration(versionedState) {
  if (versionedState) return versionedState

  return {
    version,
    state: DEFAULT_STATE,
  }
}
