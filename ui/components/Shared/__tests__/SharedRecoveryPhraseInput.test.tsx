import React from "react"
import { cleanup, fireEvent, render, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SharedRecoveryPhraseInput from "../SharedRecoveryPhraseInput"

const label = "Input recovery phrase"

const renderInput = (errorMessage?: string) => {
  const onChange = jest.fn()
  const onUnknownWordsChange = jest.fn()
  const ui = render(
    <SharedRecoveryPhraseInput
      onChange={onChange}
      onUnknownWordsChange={onUnknownWordsChange}
      label={label}
      errorMessage={errorMessage}
    />,
  )

  // Other test files sharing this process may leave their DOM behind.
  const view = within(ui.container)

  return {
    ...view,
    input: view.getByRole("textbox", { name: label }),
    onChange,
    onUnknownWordsChange,
  }
}

const getSuggestions = (view: ReturnType<typeof renderInput>) =>
  view.queryAllByRole("option").map((option) => option.textContent)

describe("SharedRecoveryPhraseInput", () => {
  afterEach(() => {
    cleanup()
  })

  test("should pass typed text on, trimmed", async () => {
    const { input, onChange } = renderInput()

    await userEvent.type(input, "abandon about ")

    expect(input).toHaveValue("abandon about ")
    expect(onChange).toHaveBeenLastCalledWith("abandon about")
  })

  test("should not mark an unknown word while it's being typed", async () => {
    const { input, onUnknownWordsChange } = renderInput()

    await userEvent.type(input, "abandon abandom")

    expect(input).toHaveAttribute("aria-invalid", "false")
    expect(onUnknownWordsChange).toHaveBeenLastCalledWith([])
  })

  test("should mark an unknown word once it's followed by a space", async () => {
    const { input, onUnknownWordsChange } = renderInput()

    await userEvent.type(input, "abandon abandom ")

    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(onUnknownWordsChange).toHaveBeenLastCalledWith([2])
  })

  test("should mark an unknown word when the field loses focus", async () => {
    const { input, onUnknownWordsChange } = renderInput()

    await userEvent.type(input, "abandon abandom")
    await userEvent.tab()

    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(onUnknownWordsChange).toHaveBeenLastCalledWith([2])
  })

  test("should mark an unknown word when the caret moves off it", async () => {
    const { input, onUnknownWordsChange } = renderInput()

    await userEvent.type(input, "about abandom")
    expect(onUnknownWordsChange).toHaveBeenLastCalledWith([])

    await userEvent.type(input, "{ArrowLeft}", {
      initialSelectionStart: 5,
      initialSelectionEnd: 5,
    })

    expect(onUnknownWordsChange).toHaveBeenLastCalledWith([2])
  })

  test("should check every pasted word at once", async () => {
    const { input, onUnknownWordsChange } = renderInput()

    await userEvent.click(input)
    await userEvent.paste("abandon abandom about abndon")

    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(onUnknownWordsChange).toHaveBeenLastCalledWith([2, 4])
  })

  test("should accept valid words without marking them", async () => {
    const { input, onUnknownWordsChange } = renderInput()

    await userEvent.click(input)
    await userEvent.paste(`${"abandon ".repeat(11)}about`)
    await userEvent.tab()

    expect(input).toHaveAttribute("aria-invalid", "false")
    expect(onUnknownWordsChange).toHaveBeenLastCalledWith([])
  })

  test("should show and describe the input with an error message", () => {
    const errorMessage = "Word 2 isn't in the recovery word list"
    const { input } = renderInput(errorMessage)

    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAccessibleDescription(errorMessage)
  })

  describe("suggestions", () => {
    test("should list matching words once two letters are typed", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "a")
      expect(view.queryByRole("listbox")).not.toBeInTheDocument()

      await userEvent.type(view.input, "b")
      expect(view.getByRole("listbox", { name: "Suggested words" })).toBe(
        view.getByRole("listbox"),
      )
      expect(getSuggestions(view)).toEqual([
        "abandon",
        "ability",
        "able",
        "about",
        "above",
        "absent",
      ])
      expect(view.input).toHaveAttribute("aria-autocomplete", "list")
      expect(view.input).toHaveAttribute(
        "aria-controls",
        view.getByRole("listbox").id,
      )
      expect(view.getByText("6 suggestions")).toBeInTheDocument()
    })

    test("should replace the typed word with a clicked suggestion", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "abandon abo")
      await userEvent.click(view.getByRole("option", { name: "about" }))

      expect(view.input).toHaveValue("abandon about ")
      expect(view.input).toHaveFocus()
      expect(view.onChange).toHaveBeenLastCalledWith("abandon about")
      expect(view.queryByRole("listbox")).not.toBeInTheDocument()
    })

    test("should never change a word without a pick", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "abo ")

      expect(view.input).toHaveValue("abo ")
      expect(view.onUnknownWordsChange).toHaveBeenLastCalledWith([1])
    })

    test("should not list a finished word on its own", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "zoo")

      expect(view.queryByRole("listbox")).not.toBeInTheDocument()
    })

    test("should close on Escape and on blur", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab{Escape}")
      expect(view.queryByRole("listbox")).not.toBeInTheDocument()

      await userEvent.type(view.input, "o")
      expect(view.getByRole("listbox")).toBeInTheDocument()

      await userEvent.tab()
      expect(view.queryByRole("listbox")).not.toBeInTheDocument()
    })

    test("should not list words for pasted text", async () => {
      const view = renderInput()

      await userEvent.click(view.input)
      await userEvent.paste("abandon ab")

      expect(view.queryByRole("listbox")).not.toBeInTheDocument()
    })

    test("should not list words for text filled in at once", () => {
      const view = renderInput()
      const phrase = "abandon ab"

      fireEvent.input(view.input, {
        target: { value: phrase },
        inputType: "insertText",
        data: phrase,
      })

      expect(view.input).toHaveValue(phrase)
      expect(view.queryByRole("listbox")).not.toBeInTheDocument()
      expect(view.onUnknownWordsChange).toHaveBeenLastCalledWith([2])
    })
  })

  describe("keyboard", () => {
    const getHighlighted = (view: ReturnType<typeof renderInput>) =>
      view
        .queryAllByRole("option", { selected: true })
        .map((option) => option.textContent)

    test("should highlight words with the arrow keys", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab")
      expect(view.input).not.toHaveAttribute("aria-activedescendant")

      await userEvent.keyboard("{ArrowDown}")
      expect(getHighlighted(view)).toEqual(["abandon"])
      expect(view.input).toHaveAttribute(
        "aria-activedescendant",
        view.getByRole("option", { name: "abandon" }).id,
      )

      await userEvent.keyboard("{ArrowDown}{ArrowDown}")
      expect(getHighlighted(view)).toEqual(["able"])

      await userEvent.keyboard("{ArrowUp}")
      expect(getHighlighted(view)).toEqual(["ability"])
      expect(view.input).toHaveValue("ab")
    })

    test("should wrap around the list", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab{ArrowUp}")
      expect(getHighlighted(view)).toEqual(["absent"])

      await userEvent.keyboard("{ArrowDown}")
      expect(getHighlighted(view)).toEqual(["abandon"])
    })

    test("should pick the highlighted word with Enter", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "abandon ab{ArrowDown}{ArrowDown}")
      await userEvent.keyboard("{Enter}")

      expect(view.input).toHaveValue("abandon ability ")
      expect(view.onChange).toHaveBeenLastCalledWith("abandon ability")
      expect(view.queryByRole("listbox")).not.toBeInTheDocument()
    })

    test("should pick the highlighted word with Tab and keep focus", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab{ArrowUp}")
      await userEvent.tab()

      expect(view.input).toHaveValue("absent ")
      expect(view.input).toHaveFocus()
    })

    test("should leave the field on Tab with nothing highlighted", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab")
      await userEvent.tab()

      expect(view.input).toHaveValue("ab")
      expect(view.input).not.toHaveFocus()
    })

    test("should not pick on Enter with nothing highlighted", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab{Enter}")

      expect(view.input).toHaveValue("ab\n")
    })

    test("should drop the highlight when typing on", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab{ArrowDown}o")

      expect(getSuggestions(view)).toEqual(["about", "above"])
      expect(getHighlighted(view)).toEqual([])
    })

    test("should drop the highlight on Escape", async () => {
      const view = renderInput()

      await userEvent.type(view.input, "ab{ArrowDown}{Escape}")
      expect(view.queryByRole("listbox")).not.toBeInTheDocument()
      expect(view.input).not.toHaveAttribute("aria-activedescendant")

      await userEvent.keyboard("o")
      expect(getHighlighted(view)).toEqual([])
    })
  })

  test("should turn off browser spellcheck and autofill", () => {
    const { input } = renderInput()

    expect(input).toHaveAttribute("spellcheck", "false")
    expect(input).toHaveAttribute("autocomplete", "off")
    expect(input).toHaveAttribute("autocorrect", "off")
    expect(input).toHaveAttribute("autocapitalize", "off")
  })
})
