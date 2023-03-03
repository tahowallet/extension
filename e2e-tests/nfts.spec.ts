import { FeatureFlags } from "@tallyho/tally-background/features"
import { wait } from "@tallyho/tally-background/lib/utils"
import { skipIfFeatureFlagged, test, expect } from "./utils"

skipIfFeatureFlagged(FeatureFlags.SUPPORT_NFT_TAB)

test.describe("NFTs", () => {
  test.use({ viewport: { width: 384, height: 600 } })

  test("User can view nft collections, poaps and badges", async ({
    page,
    backgroundPage,
    walletPageHelper,
  }) => {
    await test.step("Shows loading state", async () => {
      let shouldInterceptRequests = true

      // Set a delay so we don't miss loading states
      await backgroundPage.route(/api\.simplehash\.com/i, async (route) => {
        if (!shouldInterceptRequests) {
          route.continue()
          return
        }

        const response = await route.fetch().catch((err) => {
          // Waiting for the response doesn't prevent context disposed errors
          // consistently
          if (
            err instanceof Error &&
            err.message.includes("Request context disposed")
          ) {
            // noop
          } else {
            throw err
          }
        })

        if (response) {
          await wait(800)
          await route.fulfill({ response })
        }
      })

      await walletPageHelper.onboardReadOnlyAddress("bravonaver.eth")
      await walletPageHelper.navigateTo("NFTs")

      await expect(page.getByTestId("loading_doggo")).toBeVisible()

      // Wait until load finishes
      await expect(page.getByTestId("loading_doggo")).not.toBeVisible()
      shouldInterceptRequests = false
    })

    // Header stats locators
    const currencyTotal = page.getByTestId("nft_header_currency_total")
    const nftCount = page.getByTestId("nft_header_nft_count")
    const collectionCount = page.getByTestId("nft_header_collection_count")
    const badgeCount = page.getByTestId("nft_header_badge_count")

    await test.step("Check balances", async () => {
      await expect(currencyTotal).not.toHaveText(/0.00/)

      await expect(nftCount).not.toHaveText("0")

      await expect(collectionCount).not.toHaveText("0")

      await expect(badgeCount).not.toHaveText("0")
    })

    await test.step("Filtering accounts", async () => {
      await page.getByRole("button", { name: "Filter collections" }).click()

      await page
        .getByTestId("nft_account_filters")
        .filter({ hasText: "bravonaver.eth" })
        .getByRole("checkbox")
        .click()

      await page
        .getByTestId("nft_filters_menu")
        .getByRole("button", { name: "Close menu" })
        .click()

      // This could match 100.00, however we're checking 0 counts below
      await expect(currencyTotal).toHaveText(/0.00/)

      // Balances should be zero after filtering our only account
      await expect(nftCount).toHaveText("0")

      await expect(collectionCount).toHaveText("0")

      await expect(badgeCount).toHaveText("0")

      // Disable account filter
      await page.getByRole("button", { name: "Filter collections" }).click()

      await page
        .getByTestId("nft_account_filters")
        .getByTestId("toggle_item")
        .filter({ hasText: "bravonaver.eth" })
        .getByRole("checkbox")
        .click()

      await page
        .getByTestId("nft_filters_menu")
        .getByRole("button", { name: "Close menu" })
        .click()
    })

    await test.step("Filtering a collection", async () => {
      await page
        .getByRole("tablist")
        .getByRole("tab", { name: "Badges" })
        .click()

      const badges = await badgeCount.innerText()

      // Filter POAPs
      await page.getByRole("button", { name: "Filter collections" }).click()

      await page
        .getByTestId("nft_collection_filters")
        .getByTestId("toggle_item")
        .filter({ hasText: "POAP" })
        .getByRole("checkbox")
        .click()

      await page
        .getByTestId("nft_filters_menu")
        .getByRole("button", { name: "Close menu" })
        .click()

      // Filtering POAPs should change the header's displayed badge count
      // unless we don't have any POAPs. We don't check rendered items
      // because that could break with virtual lists
      await expect(badgeCount).not.toHaveText(badges)

      // Cleanup
      await page.getByRole("button", { name: "Filter collections" }).click()

      await page
        .getByTestId("nft_collection_filters")
        .getByTestId("toggle_item")
        .filter({ hasText: "POAP" })
        .getByRole("checkbox")
        .click()

      await page
        .getByTestId("nft_filters_menu")
        .getByRole("button", { name: "Close menu" })
        .click()

      await page.getByRole("tablist").getByRole("tab", { name: "NFTs" }).click()
    })

    // Check collections
    await test.step("Order by collection count", async () => {
      await page.getByRole("button", { name: "Filter collections" }).click()
      await page.getByText("Number (in 1 collection)").click()

      await page
        .getByTestId("nft_filters_menu")
        .getByRole("button", { name: "Close menu" })
        .click()
    })

    const collectionItem = await test.step(
      "Check collection expands",
      async () => {
        const nftCollection = page
          .getByTestId("nft_list_item")
          .filter({ has: page.getByTestId("nft_list_item_collection") })
          .filter({ hasText: /noox badge/i })
          .first()

        await nftCollection.hover()
        await nftCollection.getByTestId("expand").click()

        const collectionItems = nftCollection.getByTestId(
          "nft_list_item_single"
        )

        expect((await collectionItems.all()).length).toBeGreaterThan(1)

        return collectionItems.filter({ hasText: /ethereum unique user/i })
      }
    )

    // Check Details
    await test.step("Check NFT details", async () => {
      await collectionItem.getByTestId("view").click()

      const previewMenu = page.getByTestId("nft_preview_menu")

      await expect(
        page.getByText(
          /owning this badge indicates that the user has created 1,000\+ transactions on eth/i
        )
      ).toBeVisible()

      // Displays traits
      expect(
        await previewMenu.locator(".preview_property_trait").allInnerTexts()
      ).toEqual(
        expect.arrayContaining(["category", "project", "required_action"])
      )

      // ...And their values
      await expect(
        previewMenu.locator(".preview_property_value")
      ).toContainText([/general/i, /ethereum/i, /generate transactions/i])

      await previewMenu.getByRole("button", { name: "Close menu" }).click()
    })

    // Check Badges
    await page.getByRole("tablist").getByRole("tab", { name: "Badges" }).click()

    await test.step("Check Poap Badge", async () => {
      const poap = page
        .getByTestId("nft_list_item_single")
        .filter({ hasText: /paladin community call/i })
        .first()

      await poap.hover()
      await poap.getByRole("button", { name: "view" }).click()

      // Check details
      const poapPreview = page.getByTestId("nft_preview_menu")

      await expect(
        poapPreview.getByRole("heading", {
          name: "Paladin Community Call #04",
        })
      ).toBeVisible()

      expect(
        await poapPreview
          .getByRole("link", { name: "POAP" })
          .getAttribute("href")
      ).toEqual("https://app.poap.xyz/token/3114612")

      // Description
      await expect(
        poapPreview.getByText(
          "POAP for 4th Paladin and final community call of 2021."
        )
      ).toBeVisible()

      // Displays properties
      const poapTraits = poapPreview.getByTestId("nft_properties_list")

      await expect(poapTraits.getByText("Event")).toBeVisible()
      await expect(
        poapTraits.getByTitle("Paladin Community Call #04")
      ).toBeVisible()
      await expect(poapTraits.getByText("Year")).toBeVisible()
      await expect(poapTraits.getByText("2021")).toBeVisible()

      await poapPreview.getByRole("button", { name: "Close menu" }).click()
    })

    // Check a Galxe badge
    await test.step("Check a Galxe badge", async () => {
      const galxeBadge = page.getByTestId("nft_list_item_single").filter({
        has: page.getByText("Odos.xyz - DEFI Aggregator III"),
      })

      await galxeBadge.scrollIntoViewIfNeeded()

      await galxeBadge.getByTestId("view").click()

      const galxePreview = page.getByTestId("nft_preview_menu")

      await expect(
        galxePreview.getByRole("heading", {
          name: "Odos.xyz - DEFI Aggregator III",
        })
      ).toBeVisible()

      expect(
        await galxePreview
          .getByRole("link", { name: "Galxe" })
          .getAttribute("href")
      ).toEqual(
        "https://galxe.com/nft/21102/0x91eEdA83433690056e22fe33F0E2FFc754bA1076"
      )

      // Displays properties
      const badgeTraits = galxePreview.getByTestId("nft_properties_list")

      await expect(badgeTraits.getByText("category")).toBeVisible()
      await expect(
        badgeTraits.getByText("Odos.xyz - DEFI Aggregator III")
      ).toBeVisible()
      await expect(badgeTraits.getByText("birthday")).toBeVisible()
      await expect(badgeTraits.getByText("1670832780")).toBeVisible()
    })
  })
})
