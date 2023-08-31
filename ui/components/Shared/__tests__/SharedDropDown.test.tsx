import React from "react"
import { render, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SharedDropdown from "../SharedDropDown"

describe("SharedDropdown", () => {
  test("should display and hide content on clicking the toggler", async () => {
    const itemAction = jest.fn()
    const ui = render(
      <SharedDropdown
        toggler={(toggle) => (
          <button type="button" onClick={() => toggle()}>
            toggle dropdown
          </button>
        )}
        options={[
          {
            key: "test",
            label: "First Item",
            onClick: itemAction,
            icon: "somesvg.svg",
          },
        ]}
      />,
    )

    const toggler = await ui.findByText("toggle dropdown")
    expect(toggler).toBeInTheDocument()

    expect(ui.queryByText("First Item")).not.toBeInTheDocument()

    await userEvent.click(toggler)

    expect(await ui.findByText("First Item")).toBeInTheDocument()
  })

  test("should hide dropdown after clicking an item", async () => {
    const itemAction = jest.fn()
    const ui = render(
      <SharedDropdown
        toggler={(toggle) => (
          <button type="button" onClick={() => toggle()}>
            toggle dropdown
          </button>
        )}
        options={[
          {
            key: "test",
            label: "First Item",
            onClick: itemAction,
            icon: "somesvg.svg",
          },
        ]}
      />,
    )

    const toggler = await ui.findByText("toggle dropdown")
    expect(toggler).toBeInTheDocument()

    await userEvent.click(toggler)

    const firstItem = await ui.findByText("First Item")

    await userEvent.click(firstItem)

    await waitFor(() => {
      expect(itemAction).toHaveBeenCalled()
    })

    fireEvent.transitionEnd(firstItem, { bubbles: true })

    await waitFor(() =>
      expect(ui.queryByText("First Item")).not.toBeInTheDocument(),
    )
  })
})
