import React, { ReactElement } from "react"
import userEvent from "@testing-library/user-event"
import { renderWithProviders } from "../../tests/test-utils"
import { useSwitchablePanels } from ".."

function Panels({ names }: { names: string[] }): ReactElement {
  return useSwitchablePanels(
    names.map((name) => ({
      name,
      panelElement: () => <p>{`${name} contents`}</p>,
    })),
  )
}

describe("useSwitchablePanels", () => {
  it("shows a lone panel's contents without tab chrome", () => {
    const ui = renderWithProviders(<Panels names={["Details"]} />)

    expect(ui.queryByRole("tablist")).toBeNull()
    expect(ui.getByText("Details contents")).toBeInTheDocument()
  })

  it("shows tabs for several panels and switches between them", async () => {
    const ui = renderWithProviders(
      <Panels names={["Details", "Simulation", "Raw data"]} />,
    )

    expect(ui.getAllByRole("tab")).toHaveLength(3)
    expect(ui.getByText("Details contents")).toBeInTheDocument()

    await userEvent.click(ui.getByRole("tab", { name: "Simulation" }))

    expect(ui.getByText("Simulation contents")).toBeInTheDocument()
    expect(ui.queryByText("Details contents")).toBeNull()
  })
})
