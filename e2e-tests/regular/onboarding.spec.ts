// eslint-disable-next-line import/no-extraneous-dependencies
import { Wallet } from "ethers"
import { test, expect } from "../utils"
import { getOnboardingPage } from "../utils/onboarding"

test.describe("Onboarding", () => {
  test("User can onboard a read-only address", async ({
    page: popup,
    walletPageHelper,
  }) => {
    const readOnlyAddress = "testertesting.eth"
    await walletPageHelper.onboarding.addReadOnlyAccount(readOnlyAddress)

    await walletPageHelper.setViewportSize()
    await walletPageHelper.goToStartPage()

    await expect(async () => {
      await expect(
        popup.getByTestId("top_menu_profile_button").last(),
      ).toHaveText(readOnlyAddress)
    }).toPass()

    await expect(popup.getByTestId("wallet_balance")).toBeVisible()

    await expect(popup.getByTestId("wallet_balance")).not.toContainText("$0")
  })

  test("User can onboard with a existing seed-phrase", async ({
    context,
    page: popup,
    walletPageHelper,
  }) => {
    const wallet = Wallet.createRandom()
    const page = await getOnboardingPage(context)

    await page.getByRole("button", { name: "Use existing wallet" }).click()
    await page.getByRole("button", { name: "Import recovery phrase" }).click()
    await page.locator('input[name="password"]').fill("12345678")
    await page.locator('input[name="confirm_password"]').fill("12345678")
    await page.getByRole("button", { name: "Begin the hunt" }).click()

    await page
      .getByRole("textbox", { name: "Input recovery phrase" })
      .fill(wallet.mnemonic.phrase)

    await page.getByRole("button", { name: "Import account" }).click()
    await expect(
      page.getByRole("heading", { name: "Welcome to Taho" }),
    ).toBeVisible()

    await walletPageHelper.setViewportSize()
    await walletPageHelper.goToStartPage()

    await popup.getByTestId("top_menu_profile_button").last().hover()

    await popup.getByRole("button", { name: "Copy address" }).click()

    const address = await popup.evaluate(() => navigator.clipboard.readText())

    expect(address.toLowerCase()).toEqual(wallet.address.toLowerCase())
  })

  test("User can onboard with a new seed-phrase", async ({
    context,
    page: popup,
    walletPageHelper,
  }) => {
    const page = await getOnboardingPage(context)

    await page.getByRole("button", { name: "Create new wallet" }).click()
    await page.locator('input[name="password"]').fill("12345678")
    await page.locator('input[name="confirm_password"]').fill("12345678")

    await page.getByRole("button", { name: "Begin the hunt" }).click()
    await page.getByRole("button", { name: "Create recovery phrase" }).click()

    // Wait for the seed phrase to load.
    const seedPhraseWord = await page.locator(".seed_phrase .word")
    await expect(seedPhraseWord).toHaveCount(24)

    // Extract seed into an array of words with no spaces or dashes.
    const seedWords = (
      await page.locator(".seed_phrase .word").allTextContents()
    ).map((word) => word.replace(/-|\s/, ""))

    await page.getByRole("button", { name: "I wrote it down" }).click()

    const seedWordPlaceholders = page.getByTestId(
      "verify_seed_word_placeholder",
    )

    // Extract the ids of the seed phrase words that need to be verified and
    // store them as an array of numbers.
    const wordsToVerify = (await seedWordPlaceholders.allTextContents()).map(
      (word) => Number((word.match(/\d+/) ?? ["0"])[0]),
    )

    const wordsInWrongOrder = wordsToVerify.slice(0, -2).concat(
      // last 2 in wrong order
      wordsToVerify.slice(-2).reverse(),
    )

    // eslint-disable-next-line no-restricted-syntax
    for (const wordPos of wordsInWrongOrder) {
      const word = seedWords[wordPos - 1]

      // eslint-disable-next-line no-await-in-loop
      await page
        .getByTestId("remaining_seed_words")
        .getByRole("button", { name: word })
        .first() // There could be repeated words
        .click()
    }

    await page.getByRole("button", { name: "Verify recovery phrase" }).click()

    await expect(
      page.getByRole("button", { name: "Incorrect Order" }),
    ).toBeVisible()

    // Remove all to start over in valid order
    // eslint-disable-next-line no-restricted-syntax
    for (const placeholder of await seedWordPlaceholders.all()) {
      // eslint-disable-next-line no-await-in-loop
      await placeholder.click()
    }

    // Focus first placeholder
    await seedWordPlaceholders.first().click()

    // eslint-disable-next-line no-restricted-syntax
    for (const wordPos of wordsToVerify) {
      const word = seedWords[wordPos - 1]

      // eslint-disable-next-line no-await-in-loop
      await page
        .getByTestId("remaining_seed_words")
        .getByRole("button", { name: word })
        .click()
    }

    await expect(page.getByRole("button", { name: "Verified" })).toBeVisible()
    await page.getByRole("button", { name: "Finalize" }).click()

    await expect(
      page.getByRole("heading", { name: "Welcome to Taho" }),
    ).toBeVisible()

    await walletPageHelper.setViewportSize()
    await walletPageHelper.goToStartPage()

    // If the popup finished rendering then we were able to onboard successfully
    await expect(
      popup.getByTestId("top_menu_network_switcher").last(),
    ).toHaveText("Ethereum")
  })
})
