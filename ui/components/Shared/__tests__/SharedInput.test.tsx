import React from "react"
import { render, waitFor, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SharedInput from "../SharedInput"

const onChange = jest.fn()
const text = "Test"

describe("SharedInput", () => {
  afterEach(() => {
    cleanup()
  })

  test("should render password input element", () => {
    const ui = render(<SharedInput placeholder={text} onChange={onChange} />)
    const inputElement = ui.getByPlaceholderText(text)
    expect(inputElement).toBeInTheDocument()
  })

  test("should be able to type into input", async () => {
    const value = "Text text"
    const ui = render(<SharedInput placeholder={text} onChange={onChange} />)
    const inputElement = ui.getByPlaceholderText(text)

    await userEvent.click(inputElement)
    userEvent.type(inputElement, value)
    await waitFor(() => expect(inputElement).toHaveValue(value))
  })
})
