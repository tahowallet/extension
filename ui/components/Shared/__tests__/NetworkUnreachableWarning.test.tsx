import React from "react"
import { MemoryRouter } from "react-router-dom"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OPTIMISM } from "@tallyho/tally-background/constants"
import NetworkUnreachableWarning from "../NetworkUnreachableWarning"

const renderWarning = () =>
  render(
    <MemoryRouter>
      <NetworkUnreachableWarning chainID={OPTIMISM.chainID} />
    </MemoryRouter>,
  )

const renderChainlessWarning = () =>
  render(
    <MemoryRouter>
      <NetworkUnreachableWarning />
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

  it("keeps the advice but drops the link when given no chain", async () => {
    const ui = renderChainlessWarning()

    await userEvent.hover(ui.getByTestId("tooltip_wrap"))

    // Same sentence either way. Callers omit the chain where following a link
    // would cost the user something — a signing screen has no way back from a
    // navigation.
    expect(ui.getByText(/checking the RPC configuration/)).toBeVisible()
    expect(ui.queryByRole("link")).not.toBeInTheDocument()
  })
})
