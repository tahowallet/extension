import { test, expect } from "../utils"

test.describe("Signing", () => {
  test("User can sign in with Ethereum", async ({
    context,
    walletPageHelper,
  }) => {
    await walletPageHelper.onboarding.addNewWallet()
    await walletPageHelper.hideDappConnectPopup()

    const siwe = await context.newPage()
    await siwe.goto("https://login.xyz")

    await siwe.getByRole("button", { name: "SIGN-IN WITH ETHEREUM" }).click()

    const connectPopupOpens = context.waitForEvent("page")
    await siwe.getByTestId("component-wallet-button-taho").click()

    await connectPopupOpens.then(async (popup) => {
      await popup.waitForLoadState()
      await popup.getByRole("button", { name: "Connect", exact: true }).click()
    })

    const signDataPromptOpens = context.waitForEvent("page")

    await signDataPromptOpens.then(async (prompt) => {
      await prompt.getByRole("button", { name: "Sign" }).click()
    })
    // There's a bug on login.xyz that makes the test fail
    // (https://discord.com/channels/862419652286218251/886997073650655232/1173226370776694794).
    // We're adding the expectation of failure. Playwright will throw `Expected
    // to fail, but passed.` when bug is fixed.
    test.fail()
    await expect(siwe.getByText("Vote for your favorite emoji")).toBeVisible()
  })

  // test.skip("Typed data signing", async () => {})
})
