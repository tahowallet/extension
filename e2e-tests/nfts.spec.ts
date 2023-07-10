import { wait } from "@tallyho/tally-background/lib/utils"
import { test, expect } from "./utils"
import { account1Address, account1Name } from "./utils/onboarding"

test.describe("NFTs", () => {
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

      await walletPageHelper.onboarding.addReadOnlyAccount(account1Address)

      await walletPageHelper.goToStartPage()
      await walletPageHelper.setViewportSize()

      // Switch to Optimism, then to Polygon and then to Arbitrum (to load NFTs
      // on those chains).
      await walletPageHelper.switchNetwork(/^Optimism$/)
      await walletPageHelper.switchNetwork(/^Polygon$/)
      await walletPageHelper.switchNetwork(/^Arbitrum$/)

      await walletPageHelper.navigateTo("NFTs")

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
        .filter({
          hasText: account1Name,
        })
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
        .filter({
          hasText: account1Name,
        })
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

      await expect(page.getByTestId("loading_skeleton")).toHaveCount(0)

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
          .filter({ hasText: "Notable Crypto Punks" })
          .first()

        await nftCollection.hover()
        await nftCollection.getByTestId("expand").click()

        const collectionItems = nftCollection.getByTestId(
          "nft_list_item_single"
        )

        expect((await collectionItems.all()).length).toBeGreaterThan(1)

        return collectionItems.filter({ hasText: /2152/ })
      }
    )

    // Check Details
    await test.step("Check NFT details", async () => {
      await collectionItem.getByTestId("view").click()

      const previewMenu = page.getByTestId("nft_preview_menu")

      await expect(previewMenu.getByText(/^10,000$/)).toBeVisible()

      // Displays traits
      expect(
        await previewMenu.locator(".preview_property_trait").allInnerTexts()
      ).toEqual(expect.arrayContaining(["background", "body", "eyez"]))

      // ...And their values
      await expect(
        previewMenu.locator(".preview_property_value")
      ).toContainText([/dark green/i, /dark brown/i, /blue sunglasses/i])

      await previewMenu.getByRole("button", { name: "Close menu" }).click()
    })

    // Check Badges
    await page.getByRole("tablist").getByRole("tab", { name: "Badges" }).click()

    await test.step("Check Poap Badge", async () => {
      const poap = page
        .getByTestId("nft_list_item_single")
        .filter({ hasText: /Taho TEST POAP/i })
        .first()

      await poap.hover()
      await poap.getByRole("button", { name: "view" }).click()

      // Check details
      const poapPreview = page.getByTestId("nft_preview_menu")

      await expect(
        poapPreview.getByRole("heading", {
          name: "Taho TEST POAP",
        })
      ).toBeVisible()

      expect(
        await poapPreview
          .getByRole("link", { name: "POAP" })
          .getAttribute("href")
      ).toEqual("https://app.poap.xyz/token/6676760")

      // Description
      await expect(
        poapPreview.getByText(
          "This is a POAP used to test some functionalities of a Taho wallet"
        )
      ).toBeVisible()

      // Displays properties
      const poapTraits = poapPreview.getByTestId("nft_properties_list")

      await expect(poapTraits.getByText("Event")).toBeVisible()
      await expect(poapTraits.getByTitle("Taho TEST POAP")).toBeVisible()
      await expect(poapTraits.getByText("Year")).toBeVisible()
      await expect(poapTraits.getByText("2023")).toBeVisible()

      await poapPreview.getByRole("button", { name: "Close menu" }).click()
    })

    // Check a Galxe badge
    await test.step("Check a Galxe badge", async () => {
      const galxeBadge = page.getByTestId("nft_list_item_single").filter({
        has: page.getByText("PARIS"),
      })

      await galxeBadge.scrollIntoViewIfNeeded()

      await galxeBadge.getByTestId("view").click()

      const galxePreview = page.getByTestId("nft_preview_menu")

      await expect(
        galxePreview.getByRole("heading", {
          name: "PARIS",
        })
      ).toBeVisible()

      expect(
        await galxePreview
          .getByRole("link", { name: "Galxe" })
          .getAttribute("href")
      ).toEqual(
        "https://galxe.com/nft/8038/0x9972158B1456bd22cF4D2436831942a135492369"
      )

      // Displays properties
      const badgeTraits = galxePreview.getByTestId("nft_properties_list")

      await expect(badgeTraits.getByText("category")).toBeVisible()
      await expect(badgeTraits.getByText("PARIS")).toBeVisible()
      await expect(badgeTraits.getByText("birthday")).toBeVisible()
      await expect(badgeTraits.getByText("1664885216")).toBeVisible()
    })
  })
})
