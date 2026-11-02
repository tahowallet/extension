import { MemoryHistory } from "history"
import tabs, { defaultTab } from "./tabs"

/**
 * The direction a page slides in: right when going back or to a tab on the
 * left, left otherwise.
 */
export type TransitionDirection = "right" | "left"

/** The position of the tab a path belongs to, or -1 outside the tabs. */
function tabIndex(pathname: string): number {
  const tabPath = `/${pathname.split("/")[1]}`
  return tabs.findIndex(
    ({ path }) =>
      path === tabPath || (tabPath === "/" && path === defaultTab.path),
  )
}

export default function getTransitionDirection(
  history: MemoryHistory,
): TransitionDirection {
  const { entries, index, action } = history
  const current = entries[index]
  const previous = entries[action === "POP" ? index + 1 : index - 1]

  const isGoingBack =
    action === "POP" ||
    (current?.state as { isBack?: boolean } | undefined)?.isBack === true
  if (isGoingBack || !current || !previous) {
    return "right"
  }

  const currentTab = tabIndex(current.pathname)
  const previousTab = tabIndex(previous.pathname)
  if (currentTab !== -1 && previousTab !== -1 && currentTab < previousTab) {
    return "right"
  }

  return "left"
}
