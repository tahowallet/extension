import React from "react"
import userEvent from "@testing-library/user-event"
import { initialState } from "@tallyho/tally-background/redux-slices/internal-signer"
import { renderWithProviders } from "../../../tests/test-utils"
import InternalSignerUnlock from "../InternalSignerUnlock"

const password = "an_invalid_password"
const label = "Signing password"
const error = "Incorrect password"

const getPreloadedState = (status: "locked" | "unlocked") => ({
  internalSigner: {
    ...initialState,
    status,
  },
})

describe("InternalSignerUnlock", () => {
  test("should not unlock the wallet when an incorrect password is submitted", async () => {
    const ui = renderWithProviders(
      <InternalSignerUnlock displayCancelButton={false} />,
      { preloadedState: getPreloadedState("locked") },
    )
    const inputElement = ui.getByLabelText(label)
    const submitBtnElement = ui.getByRole("button")

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, password)
    await userEvent.click(submitBtnElement)

    expect(ui.queryByText(error)).toBeInTheDocument()
  })
})
