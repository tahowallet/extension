import React from "react"
import { render } from "@testing-library/react"
import SharedToggleItem, { STARS_GREY_URL } from "../SharedToggleItem"

const NAME = "TEST"
const ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const onChange = jest.fn()

describe("SharedToggleItem", () => {
  test("should render a component", async () => {
    const ui = render(
      <SharedToggleItem
        label={NAME}
        thumbnailURL={undefined}
        checked={false}
        onChange={onChange}
      />
    )

    expect(ui.queryByText(NAME)).toBeInTheDocument()
  })

  test("should display a truncated address", async () => {
    const ui = render(
      <SharedToggleItem
        label={ADDRESS}
        thumbnailURL={undefined}
        checked={false}
        onChange={onChange}
      />
    )

    expect(ui.queryByText("0x208e…090cd")).toBeInTheDocument()
  })

  test("should display a thumbnail image", async () => {
    const thumbnailURL = "./images/test.svg"
    const ui = render(
      <SharedToggleItem
        label={NAME}
        thumbnailURL={thumbnailURL}
        checked
        onChange={onChange}
      />
    )
    const thumbnail = ui.getByRole("presentation")

    expect(thumbnail).toBeInTheDocument()
    expect(thumbnail).toHaveStyle(
      `background: url(${thumbnailURL}) center no-repeat`
    )
  })

  test("should display a placeholder image if the thumbnail is undefined", async () => {
    const ui = render(
      <SharedToggleItem
        label={NAME}
        thumbnailURL={undefined}
        checked
        onChange={onChange}
      />
    )
    const thumbnail = ui.getByRole("presentation")

    expect(thumbnail).toBeInTheDocument()
    expect(thumbnail).toHaveStyle(
      `background: url(${STARS_GREY_URL}) center no-repeat`
    )
  })

  test("should be enabled", async () => {
    const ui = render(
      <SharedToggleItem
        label={ADDRESS}
        thumbnailURL={undefined}
        checked
        onChange={onChange}
      />
    )
    const toggleButton = ui.getByRole("checkbox")

    expect(toggleButton.getAttribute("aria-checked")).toBe("true")
  })

  test("should be disabled", async () => {
    const ui = render(
      <SharedToggleItem
        label={ADDRESS}
        thumbnailURL={undefined}
        checked={false}
        onChange={onChange}
      />
    )
    const toggleButton = ui.getByRole("checkbox")

    expect(toggleButton.getAttribute("aria-checked")).toBe("false")
  })
})
