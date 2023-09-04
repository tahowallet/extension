import React from "react"
import { render } from "@testing-library/react"
import FilterList from "../FilterList"
import { STARS_GREY_URL } from "../../../Shared/SharedToggleItem"

const EMPTY_MESSAGE = "Empty list"
const FILTER_LIST = [
  {
    id: "1",
    name: "Item 1",
    thumbnailURL: "./images/item_1.svg",
    isEnabled: false,
  },
  {
    id: "2",
    name: "Item 2",
    thumbnailURL: "./images/item_2.svg",
    isEnabled: true,
  },
  {
    id: "3",
    name: "Item 3",
    isEnabled: true,
  },
]
const onChange = jest.fn()

describe("FilterList", () => {
  test("should render a component", () => {
    const ui = render(
      <FilterList
        filters={FILTER_LIST}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
      />,
    )
    const list = ui.getByTestId("nft_filters_list")

    expect(list).toBeInTheDocument()
  })

  test("should display an empty message", () => {
    const ui = render(
      <FilterList
        filters={[]}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
      />,
    )
    const emptyMessage = ui.queryByText(EMPTY_MESSAGE)

    expect(emptyMessage).toBeInTheDocument()
  })

  test("should render three items", () => {
    const ui = render(
      <FilterList
        filters={FILTER_LIST}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
      />,
    )
    const items = ui.getAllByTestId("toggle_item")

    expect(items.length).toEqual(FILTER_LIST.length)
  })

  test("should display a loading skeleton for items", () => {
    const ui = render(
      <FilterList
        filters={FILTER_LIST}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
        isLoaded={false}
      />,
    )
    const items = ui.getAllByTestId("loading_skeleton")

    expect(items.length).toEqual(FILTER_LIST.length)
  })

  test("should display labels correctly", () => {
    const ui = render(
      <FilterList
        filters={FILTER_LIST}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
      />,
    )

    expect(ui.queryByText(FILTER_LIST[0].name)).toBeInTheDocument()
    expect(ui.queryByText(FILTER_LIST[1].name)).toBeInTheDocument()
    expect(ui.queryByText(FILTER_LIST[2].name)).toBeInTheDocument()
  })

  test("should display thumbnail images correctly", () => {
    const ui = render(
      <FilterList
        filters={FILTER_LIST}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
      />,
    )

    const thumbnails = ui.getAllByRole("img")

    expect(thumbnails.length).toEqual(FILTER_LIST.length)
    expect(thumbnails[0]).toHaveStyle(
      `background: url(${FILTER_LIST[0].thumbnailURL}) center no-repeat`,
    )
    expect(thumbnails[1]).toHaveStyle(
      `background: url(${FILTER_LIST[1].thumbnailURL}) center no-repeat`,
    )
  })

  test("should display a placeholder image if item doesn't have it", () => {
    const ui = render(
      <FilterList
        filters={FILTER_LIST}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
      />,
    )

    const thumbnails = ui.getAllByRole("img")

    expect(thumbnails.length).toEqual(FILTER_LIST.length)
    expect(thumbnails[2]).toHaveStyle(
      `background: url(${STARS_GREY_URL}) center no-repeat`,
    )
  })

  test("should correctly display the state of the toggle buttons for items", () => {
    const ui = render(
      <FilterList
        filters={FILTER_LIST}
        onChange={onChange}
        emptyMessage={EMPTY_MESSAGE}
      />,
    )

    const toggleButtons = ui.getAllByRole("checkbox")

    expect(toggleButtons[0].getAttribute("aria-checked")).toBe("false")
    expect(toggleButtons[1].getAttribute("aria-checked")).toBe("true")
    expect(toggleButtons[2].getAttribute("aria-checked")).toBe("true")
  })
})
