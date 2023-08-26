import React from "react"
import { render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SharedTooltip from "../SharedTooltip"

const text = "Text text"
const id = "tooltip_wrap"

describe("SharedTooltip", () => {
  test("should display a tooltip", async () => {
    const ui = render(
      <SharedTooltip width={100}>
        <p>{text}</p>
      </SharedTooltip>,
    )
    const tooltipElement = ui.getByTestId(id)

    expect(tooltipElement).toBeInTheDocument()
    expect(ui.queryByText(text)).not.toBeInTheDocument()
    await userEvent.hover(tooltipElement)
    await waitFor(() => expect(ui.getByText(text)).toBeInTheDocument())
  })
})
