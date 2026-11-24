import browser from "webextension-polyfill"

/** Seconds without input after which Chrome reports the user idle. */
const IDLE_AFTER_SECONDS = 5 * 60

/**
 * Checks whether the user is away using the browser's idle detection, which
 * also counts a locked screen as away. If the idle state can't be queried,
 * the user is treated as active.
 */
export default async function isUserIdle(): Promise<boolean> {
  try {
    return (await browser.idle.queryState(IDLE_AFTER_SECONDS)) !== "active"
  } catch {
    return false
  }
}
