import React from "react"
import { MemoryRouter } from "react-router-dom"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OPTIMISM } from "@tallyho/tally-background/constants"
import NetworkUnreachableWarning from "../NetworkUnreachableWarning"

const renderWarning = (linkToSettings = true) =>
  render(
    <MemoryRouter>
      <NetworkUnreachableWarning
        chainID={OPTIMISM.chainID}
        linkToSettings={linkToSettings}
      />
    </MemoryRouter>,
  )

describe("NetworkUnreachableWarning", () => {
  it("labels the icon for anyone who cannot see it", () => {
    const ui = renderWarning()

    expect(ui.getByLabelText("Network connection problem")).toBeVisible()
  })

  it("keeps its explanation out of the way until asked", () => {
    const ui = renderWarning()

    expect(ui.queryByText(/trouble connecting/)).not.toBeInTheDocument()
  })

  it("explains itself on hover", async () => {
    const ui = renderWarning()

    await userEvent.hover(ui.getByTestId("tooltip_wrap"))

    expect(ui.getByText(/Taho is having trouble connecting/)).toBeVisible()
  })

  it("offers a way to the network settings rather than only bad news", async () => {
    const ui = renderWarning()

    await userEvent.hover(ui.getByTestId("tooltip_wrap"))

    expect(
      ui.getByRole("link", { name: "checking the RPC configuration" }),
    ).toHaveAttribute("href", "/settings/custom-networks")
  })

  it("keeps the advice but drops the link where following it would cost something", async () => {
    const ui = renderWarning(false)

    await userEvent.hover(ui.getByTestId("tooltip_wrap"))

    // Same sentence either way; a signing screen has no way back from a
    // navigation, so there is nothing to navigate.
    expect(ui.getByText(/checking the RPC configuration/)).toBeVisible()
    expect(ui.queryByRole("link")).not.toBeInTheDocument()
  })
})
