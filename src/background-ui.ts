import { browser, startApi } from "@tallyho/tally-api"

startApi().then(async ({ main }) => {
  const accountsApi = main.getApi()["/accounts/"]
  let latestActivityHashes = (
    await accountsApi.GET({ address: null })
  ).activity.map(({ hash }) => hash)
  main
    .getApi()
    ["/accounts/"].subscribe(
      ({
        total_balance: { amount: totalBalance },
        activity: updatedActivity,
      }) => {
        const newActivity = updatedActivity.filter(({ hash }) =>
          latestActivityHashes.includes(hash)
        )

        browser.notifications.create("balance-udpate", {
          type: "basic",
          title: "Balance Update",
          message: `<address> has balance ${totalBalance}`,
          contextMessage: `${newActivity.length} transactions have updated the balance for <address> to ${totalBalance}`,
        })

        latestActivityHashes = updatedActivity.map(({ hash }) => hash)
      }
    )
})
