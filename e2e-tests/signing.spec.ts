import { test, expect, createWallet } from "./utils"

test.describe("Signing", () => {
  test.use({ viewport: { width: 384, height: 600 } })

  test("User can sign in with Ethereum", async ({
    context,
    page,
    walletPageHelper,
  }) => {
    await createWallet(page, walletPageHelper.extensionId)

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
})
