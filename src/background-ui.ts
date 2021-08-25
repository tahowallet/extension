import { browser, newProxyStore } from "@tallyho/tally-api"

newProxyStore().then((backgroundStore) => {
  // undefined if no account has been resolved, string array with the latest
  // activity hashes if it has.
  let latestActivityHashes: Set<string> | undefined

  backgroundStore.subscribe(() => {
    const state = backgroundStore.getState()
    const {
      combinedData: { totalUsdValue, activity: updatedActivity },
    } = state.account

    if (updatedActivity) {
      // Undefined activity hashes means we're initializing. Otherwise, notify
      // for any new activity.
      if (typeof latestActivityHashes === "undefined") {
        latestActivityHashes = new Set()
      } else {
        const newActivity = updatedActivity.filter(({ hash }) =>
          latestActivityHashes.has(hash)
        )

        browser.notifications.create("balance-update", {
          type: "basic",
          title: "Balance Update",
          message: `<address> has balance ${totalUsdValue}`,
          contextMessage: `${newActivity.length} transactions have updated the balance for <address> to ${totalUsdValue}`,
        })
      }

      latestActivityHashes = updatedActivity.reduce(
        (acc, { hash }) => acc.add(hash),
        latestActivityHashes
      )
    } else {
      // Account has been cleared, reset activity hashes so they can be
      // reinitialized next time the account is set.
      latestActivityHashes = undefined
    }
  })
})
