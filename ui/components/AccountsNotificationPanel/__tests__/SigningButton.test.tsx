import { initialState } from "@tallyho/tally-background/redux-slices/internal-signer"
import userEvent from "@testing-library/user-event"
import { createMemoryHistory } from "history"
import React from "react"
import { Router } from "react-router-dom"
import { renderWithProviders } from "../../../tests/test-utils"
import SigningButton from "../SigningButton"

const onChange = jest.fn()
const unlockText = "Unlock signing"
const lockText = "Lock signing"

const getPreloadedState = (status: "locked" | "unlocked") => ({
  internalSigner: {
    ...initialState,
    status,
  },
})

describe("SigningButton", () => {
  test("should go to the unlocking page after being clicked when the wallet is locked", async () => {
    const history = createMemoryHistory()
    const ui = renderWithProviders(
      <Router history={history}>
        <SigningButton onCurrentAddressChange={onChange} />
      </Router>,
      { preloadedState: getPreloadedState("locked") },
    )

    const buttonElement = ui.getByRole("button")

    expect(buttonElement).toHaveTextContent(unlockText)
    await userEvent.click(buttonElement)
    expect(history.location.pathname).toBe("/internal-signer/unlock")
  })

  test("should go to the root page after being clicked when the wallet is unlocked", async () => {
    const history = createMemoryHistory()
    const ui = renderWithProviders(
      <Router history={history}>
        <SigningButton onCurrentAddressChange={onChange} />
      </Router>,
      { preloadedState: getPreloadedState("unlocked") },
    )

    const buttonElement = ui.getByRole("button")

    expect(buttonElement).toHaveTextContent(lockText)
    await userEvent.click(buttonElement)
    expect(history.location.pathname).toBe("/")
  })
})
