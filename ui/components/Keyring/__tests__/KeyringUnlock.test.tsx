import React from "react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "../../../utils/test-utils"
import KeyringUnlock from "../KeyringUnlock"

const password = "TestPassword"
const label = "Signing password"

describe("KeyringUnlock", () => {
  test("should ", async () => {
    const ui = renderWithProviders(
      <KeyringUnlock displayCancelButton={false} />,
      {
        preloadedState: {
          keyrings: {
            keyrings: [],
            keyringMetadata: {},
            importing: false,
            status: "locked",
            keyringToVerify: null,
          },
        },
      }
    )
    const inputElement = ui.getByLabelText(label)
    const submitBtnElement = ui.getByRole("button")

    await userEvent.click(inputElement)
    await userEvent.type(inputElement, password)
    await userEvent.click(submitBtnElement)

    expect(ui.queryByText("Incorrect password")).toBeInTheDocument()
  })
})
