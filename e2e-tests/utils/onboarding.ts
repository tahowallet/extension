import { BrowserContext, test as base, expect, Page } from "@playwright/test"

export const getOnboardingPage = async (
  context: BrowserContext
): Promise<Page> => {
  const getOnboardingOrThrow = () => {
    const pages = context.pages()

    const onboarding = pages.find((page) => /onboarding/.test(page.url()))

    if (!onboarding) {
      throw new Error("Unable to find onboarding tab")
    }

    return onboarding
  }

  await expect(async () => getOnboardingOrThrow()).toPass()

  return getOnboardingOrThrow()
}

const DEFAULT_PASSWORD = "12345678"
// The account1 is a 3rd address associated with the testertesting.eth account.
// It owns some NFTs/badges.
export const account1Address = "0x6f1b1f1feb01235e15a7962f16c389c7f8218ed6"
export const account1Name = /^e2e\.testertesting\.eth$/

export default class OnboardingHelper {
  constructor(
    public readonly popup: Page,
    // public readonly backgroundPage: Page,
    public readonly context: BrowserContext
  ) {}

  async addReadOnlyAccount(
    addressOrName: string,
    onboardingPage?: Page
  ): Promise<void> {
    const page = onboardingPage || (await getOnboardingPage(this.context))

    await base.step("Onboard readonly address", async () => {
      await page.getByRole("button", { name: "Use existing wallet" }).click()
      await page.getByRole("button", { name: "Read-only address" }).click()
      await page.getByRole("textbox").fill(addressOrName)
      await page.getByRole("button", { name: "Preview Taho" }).click()

      await expect(
        page.getByRole("heading", { name: "Welcome to Taho" })
      ).toBeVisible()
    })
  }

  async addAccountFromSeed({
    phrase,
    onboardingPage,
  }: {
    phrase: string
    onboardingPage?: Page
  }): Promise<void> {
    const page = onboardingPage || (await getOnboardingPage(this.context))

    await base.step("Onboard readonly address", async () => {
      await page.getByRole("button", { name: "Use existing wallet" }).click()
      await page.getByRole("button", { name: "Import recovery phrase" }).click()

      const passwordInput = page.locator('input[name="password"]')

      if (await passwordInput.isVisible()) {
        await page.locator('input[name="password"]').fill(DEFAULT_PASSWORD)
        await page
          .locator('input[name="confirm_password"]')
          .fill(DEFAULT_PASSWORD)
      }

      await page.getByRole("button", { name: "Begin the hunt" }).click()

      await page
        .getByRole("textbox", { name: "Input recovery phrase" })
        .fill(phrase)

      await page.getByRole("button", { name: "Import account" }).click()
      await expect(
        page.getByRole("heading", { name: "Welcome to Taho" })
      ).toBeVisible()
    })
  }

  async addNewWallet(onboardingPage?: Page): Promise<void> {
    const page = onboardingPage || (await getOnboardingPage(this.context))

    await page.getByRole("button", { name: "Create new wallet" }).click()

    const passwordInput = page.locator('input[name="password"]')

    if (await passwordInput.isVisible()) {
      await page.locator('input[name="password"]').fill(DEFAULT_PASSWORD)
      await page
        .locator('input[name="confirm_password"]')
        .fill(DEFAULT_PASSWORD)
    }

    await page.getByRole("button", { name: "Begin the hunt" }).click()
    await page.getByRole("button", { name: "Create recovery phrase" }).click()

    // Verify seed
    const seedWords = (
      await page.locator(".seed_phrase .word").allTextContents()
    ).map((word) => word.replace(/-|\s/, ""))

    await page.getByRole("button", { name: "I wrote it down" }).click()

    const seedWordPlaceholders = page.getByTestId(
      "verify_seed_word_placeholder"
    )

    const wordsToVerify = (await seedWordPlaceholders.allTextContents()).map(
      (word) => Number((word.match(/\d+/) ?? ["0"])[0])
    )

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

    await page.getByRole("button", { name: "Verify recovery phrase" }).click()

    await expect(page.getByRole("button", { name: "Verified" })).toBeVisible()

    await page.getByRole("button", { name: "Finalize" }).click()

    await expect(
      page.getByRole("heading", { name: "Welcome to Taho" })
    ).toBeVisible()
  }
}
