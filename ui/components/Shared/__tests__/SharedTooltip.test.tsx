import React from "react"
import { render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SharedTooltip from "../SharedTooltip"

const text = "Text text"
const id = "tooltip_wrap"

/** Places the tooltip's 20px anchor `anchorTop` px down the window. */
function layOut(anchorTop: number) {
  jest
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function rect(this: HTMLElement) {
      const isTooltip = this.classList.contains("tooltip")
      const top = isTooltip ? anchorTop + 25 : anchorTop
      const height = isTooltip ? 100 : 20
      return {
        top,
        bottom: top + height,
        height,
        left: 0,
        right: 100,
        width: 100,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }
    })
}

async function hoverTooltip() {
  const ui = render(
    <SharedTooltip width={100}>
      <p>{text}</p>
    </SharedTooltip>,
  )
  await userEvent.hover(ui.getByTestId(id))
  return getComputedStyle(ui.getByText(text).parentElement as HTMLElement)
}

describe("SharedTooltip", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

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

  test("opens below its anchor when there's room", async () => {
    layOut(100)
    const style = await hoverTooltip()

    expect(style.top).not.toBe("")
    expect(style.bottom).toBe("")
  })

  test("flips above when the window would cut it off below", async () => {
    layOut(window.innerHeight - 40)
    const style = await hoverTooltip()

    expect(style.bottom).not.toBe("")
    expect(style.top).toBe("")
  })
})
