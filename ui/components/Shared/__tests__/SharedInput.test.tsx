import React from "react"
import { render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SharedInput from "../SharedInput"

const id = "test_input"
const label = "Input"
const text = "Test"

describe("SharedInput", () => {
  test("should render input element", () => {
    const ui = render(<SharedInput placeholder={text} />)
    const inputElement = ui.getByPlaceholderText(text)

    expect(inputElement).toBeInTheDocument()
    expect(inputElement).not.toHaveFocus()
  })

  test("should be able to type text into input", async () => {
    const value = "Test text"
    const ui = render(<SharedInput placeholder={text} />)
    const inputElement = ui.getByPlaceholderText(text)

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, value)
    await waitFor(() => expect(inputElement).toHaveValue(value))
    expect(inputElement).toHaveAttribute("type", "text")
  })

  test("should be able to type number into input", async () => {
    const value = "1"
    const ui = render(<SharedInput id={id} label={label} type="number" />)
    const inputElement = ui.getByLabelText(label)

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, value)
    await waitFor(() => expect(inputElement).toHaveValue(+value))
    expect(inputElement).toHaveAttribute("type", "number")
  })

  test("should not be able to type text into input when type is number", async () => {
    const ui = render(<SharedInput id={id} label={label} type="number" />)
    const inputElement = ui.getByLabelText(label)

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, text)
    await waitFor(() => expect(inputElement).not.toHaveValue())
    expect(inputElement).toHaveAttribute("type", "number")
  })

  test("should be able to type into input when type is password", async () => {
    const ui = render(<SharedInput id={id} label={label} type="password" />)
    const inputElement = ui.getByLabelText(label)

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, text)
    await waitFor(() => expect(inputElement).toHaveValue(text))
    expect(inputElement).toHaveAttribute("type", "password")
  })

  test("should display an error message for incorrect value", () => {
    const errorMessage = "Error Message"
    const ui = render(
      <SharedInput
        id={id}
        label={label}
        value={text}
        errorMessage={errorMessage}
      />,
    )
    const errorElement = ui.queryByText(errorMessage)

    expect(errorElement).toBeInTheDocument()
  })

  test("should display a warning message", () => {
    const warningMessage = "Warning Message"
    const ui = render(
      <SharedInput
        id={id}
        label={label}
        value={text}
        warningMessage={warningMessage}
      />,
    )
    const errorElement = ui.queryByText(warningMessage)

    expect(errorElement).toBeInTheDocument()
  })

  test("should hide content based on isEmpty attribute and not display an error message", () => {
    const errorMessage = "Error Message"
    const ui = render(
      <SharedInput
        id={id}
        label={label}
        value={text}
        errorMessage={errorMessage}
        isEmpty
      />,
    )
    const inputElement = ui.getByLabelText(label)
    const errorElement = ui.queryByText(errorMessage)

    expect(inputElement).toHaveValue("")
    expect(errorElement).not.toBeInTheDocument()
  })

  test("should not be able to type more than 1 character into input", async () => {
    const maxLength = 1
    const ui = render(
      <SharedInput id={id} label={label} maxLength={maxLength} />,
    )
    const inputElement = ui.getByLabelText(label)

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, text)
    await waitFor(() =>
      expect(inputElement).toHaveValue(text.slice(0, maxLength)),
    )
  })

  test("should work with autofocus", () => {
    const ui = render(<SharedInput id={id} label={label} autoFocus />)
    const inputElement = ui.getByLabelText(label)

    expect(inputElement).toHaveFocus()
  })
})
