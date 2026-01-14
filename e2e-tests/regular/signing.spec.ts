import { test, expect } from "../utils"

test.describe("Signing", () => {
  // TODO: host localhost testing dApp during tests
  // login.xyz failing
  test.fixme(
    "User can sign in with Ethereum",
    async ({ context, walletPageHelper, waitForExtensionPage }) => {
      await walletPageHelper.onboarding.addNewWallet()

      const siwe = await context.newPage()
      await siwe.goto("https://login.xyz")

      await siwe.pause()
      await siwe.getByRole("button", { name: "SIGN-IN WITH ETHEREUM" }).click()

      const connectPopup = walletPageHelper.getConnectPopup()
      await siwe.getByTestId("component-wallet-button-taho").click()

      await connectPopup.ready()
      await connectPopup.hideDappConnectPopup()

      await connectPopup.acceptConnection()

      const signDataPromptOpens = waitForExtensionPage()

      await signDataPromptOpens.then(async (prompt) => {
        await prompt.waitForLoadState()
        await prompt.getByRole("button", { name: "Sign" }).click()
      })

      await expect(siwe.getByText("Vote for your favorite emoji")).toBeVisible()
    },
  )

  // test.skip("Typed data signing", async () => {})
})
