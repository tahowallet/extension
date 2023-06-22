import { test, expect } from "./utils"

test.describe("Signing", () => {
  test("User can sign in with Ethereum", async ({
    context,
    walletPageHelper,
  }) => {
    test.skip(process.env.USE_MAINNET_FORK === "true")

    await walletPageHelper.onboarding.addNewWallet()

    const siwe = await context.newPage()
    await siwe.goto("https://login.xyz")

    await siwe.getByRole("button", { name: "SIGN-IN WITH ETHEREUM" }).click()

    const connectPopupOpens = context.waitForEvent("page")
    await siwe.getByText("Connect to your Web3 Wallet").click()

    await connectPopupOpens.then(async (popup) => {
      await popup.waitForLoadState()
      await popup.getByRole("button", { name: "Connect", exact: true }).click()
    })

    const signDataPromptOpens = context.waitForEvent("page")

    await signDataPromptOpens.then(async (prompt) => {
      await prompt.getByRole("button", { name: "Sign" }).click()
    })

    // If we see this then it means we were able to sign in
    await expect(siwe.getByText("Vote for your favorite emoji")).toBeVisible()
  })

  // test.skip("Typed data signing", async () => {})
})
