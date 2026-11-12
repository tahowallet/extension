import React from "react"
import { render } from "@testing-library/react"
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

  return {
    input: ui.getByRole("textbox", { name: label }),
    onChange,
    onUnknownWordsChange,
  }
}

describe("SharedRecoveryPhraseInput", () => {
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

  test("should turn off browser spellcheck and autofill", () => {
    const { input } = renderInput()

    expect(input).toHaveAttribute("spellcheck", "false")
    expect(input).toHaveAttribute("autocomplete", "off")
    expect(input).toHaveAttribute("autocorrect", "off")
    expect(input).toHaveAttribute("autocapitalize", "off")
  })
})
