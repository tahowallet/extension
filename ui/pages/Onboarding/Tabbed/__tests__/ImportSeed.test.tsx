import React from "react"
import { MemoryRouter } from "react-router-dom"
import { cleanup, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  FeatureFlags,
  storage as featureStorage,
} from "@tallyho/tally-background/features"
import { initialState } from "@tallyho/tally-background/redux-slices/internal-signer"
import { renderWithProviders } from "../../../../tests/test-utils"
import ImportSeed from "../ImportSeed"

const label = "Input recovery phrase"

const renderImportSeed = () => {
  const ui = renderWithProviders(
    <MemoryRouter>
      <ImportSeed nextPage="/" />
    </MemoryRouter>,
    {
      preloadedState: {
        internalSigner: { ...initialState, status: "unlocked" },
      },
    },
  )

  // Other test files sharing this process may leave their DOM behind.
  const page = within(ui.container)

  return {
    ...page,
    input: page.getByRole("textbox", { name: label }),
    submit: page.getByRole("button", { name: "Import account" }),
  }
}

describe("ImportSeed", () => {
  afterEach(() => {
    cleanup()
    featureStorage.clear()
  })

  describe("with word suggestions on", () => {
    beforeEach(() => {
      featureStorage.set(FeatureFlags.SUPPORT_SEED_WORD_SUGGESTIONS, "true")
    })

    test("should name an unknown word and block submit", async () => {
      const ui = renderImportSeed()

      await userEvent.click(ui.input)
      await userEvent.paste("abandon abandom")

      expect(
        ui.getByText("Word 2 isn't in the recovery word list"),
      ).toBeInTheDocument()
      expect(ui.submit).toHaveClass("disabled")
    })

    test("should name every unknown word", async () => {
      const ui = renderImportSeed()

      await userEvent.click(ui.input)
      await userEvent.paste("abandon abandom about abndon")

      expect(
        ui.getByText("Words 2 and 4 aren't in the recovery word list"),
      ).toBeInTheDocument()
    })

    test("should allow submit again once the word is fixed", async () => {
      const ui = renderImportSeed()

      await userEvent.click(ui.input)
      await userEvent.paste("abandon abandom")
      await userEvent.clear(ui.input)
      await userEvent.paste("abandon about")

      expect(ui.submit).not.toHaveClass("disabled")
      expect(
        ui.queryByText(/isn't in the recovery word list/),
      ).not.toBeInTheDocument()
    })

    test("should report the word count on submit", async () => {
      const ui = renderImportSeed()

      await userEvent.click(ui.input)
      await userEvent.paste("abandon ".repeat(11))
      await userEvent.click(ui.submit)

      expect(
        ui.getByText("You entered 11 words. A recovery phrase has 12 or 24."),
      ).toBeInTheDocument()
    })

    test("should report a checksum failure on submit", async () => {
      const ui = renderImportSeed()

      await userEvent.click(ui.input)
      await userEvent.paste("abandon ".repeat(12))
      await userEvent.click(ui.submit)

      expect(
        ui.getByText(
          "All words are valid, but the phrase doesn't check out. Check the order and spelling.",
        ),
      ).toBeInTheDocument()
    })
  })

  test("should keep the current input with word suggestions off", () => {
    featureStorage.set(FeatureFlags.SUPPORT_SEED_WORD_SUGGESTIONS, "false")
    const ui = renderImportSeed()

    expect(ui.input.tagName).toBe("DIV")
    expect(ui.input).toHaveAttribute("contenteditable", "true")
  })
})
