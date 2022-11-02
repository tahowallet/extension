import React from "react"
import { render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PasswordInput from "../PasswordInput"

const id = "test_input"
const label = "Input"

describe("PasswordInput", () => {
  test("should be able to type into input", async () => {
    const value = "Test text"
    const ui = render(<PasswordInput id={id} label={label} />)
    const inputElement = ui.getByLabelText(label)

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, value)
    await waitFor(() => expect(inputElement).toHaveValue(value))
  })

  test("should be able to change the type of input from password to text", async () => {
    const ui = render(<PasswordInput id={id} label={label} />)
    const inputElement = ui.getByLabelText(label)
    const buttonElement = ui.getByRole("switch", { checked: false })

    expect(inputElement).toHaveAttribute("type", "password")
    await userEvent.click(buttonElement)
    expect(inputElement).toHaveAttribute("type", "text")
  })
})
