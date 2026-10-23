import React from "react"
import { MemoryRouter } from "react-router-dom"
import { render } from "@testing-library/react"
import SettingButton from "../SettingButton"

const renderSettingButton = () =>
  render(
    <MemoryRouter>
      <SettingButton
        link="/settings/custom-networks"
        label="Manage networks"
        icon="continue"
      />
    </MemoryRouter>,
  )

describe("SettingButton", () => {
  it("is named by the row's own text and nothing else", () => {
    // The e2e suite navigates these rows by exact accessible name, so an icon
    // labelled inside the button would rename the row by appending to it.
    const ui = renderSettingButton()

    expect(ui.getByRole("button")).toHaveAccessibleName("Manage networks")
  })

  it("keeps its icon out of the accessibility tree", () => {
    const ui = renderSettingButton()

    // The row's text already says where this goes; the chevron only points.
    expect(ui.queryByRole("img")).not.toBeInTheDocument()
  })
})
