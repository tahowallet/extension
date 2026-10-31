import React from "react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "../../../tests/test-utils"
import SharedAddress from "../SharedAddress"

const ADDRESS = "0x9eef87f4c08d8934cb2a3309df4dec5635338115"

describe("SharedAddress, compact", () => {
  it("shows the name without an info icon, and its details on hover", async () => {
    const ui = renderWithProviders(
      <SharedAddress
        address={ADDRESS}
        name="testertesting.eth"
        nameResolverSystem="ENS"
        compact
      />,
    )

    const trigger = ui.getByRole("button", { name: "testertesting.eth" })
    expect(ui.container.querySelector(".info_icon")).toBeNull()
    // The trigger renders inside the tooltip's callback; it must still pick
    // up this component's scoped styles.
    expect(trigger.className).toMatch(/\bjsx-\d+\b/)
    expect(trigger).not.toHaveAttribute("title")

    await userEvent.hover(trigger)

    expect(ui.getByText(ADDRESS)).toBeInTheDocument()
    expect(ui.getByText("Resolved using ENS")).toBeInTheDocument()
    expect(ui.getByText("Click to copy")).toBeInTheDocument()
  })

  it("cuts a long name in the middle, keeping its suffix", () => {
    const ui = renderWithProviders(
      <SharedAddress
        address={ADDRESS}
        name="averyveryverylongname.eth"
        compact
      />,
    )

    expect(ui.getByRole("button")).toHaveTextContent("averyveryv…ame.eth")
  })

  it("shortens a bare address as usual", () => {
    const ui = renderWithProviders(<SharedAddress address={ADDRESS} compact />)

    expect(ui.getByRole("button")).toHaveTextContent("0x9eef…38115")
  })
})
