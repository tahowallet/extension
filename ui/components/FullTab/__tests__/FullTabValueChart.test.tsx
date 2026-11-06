import React from "react"
import { AnyAction, configureStore } from "@reduxjs/toolkit"
import { fireEvent, waitFor } from "@testing-library/react"
import rootReducer from "@tallyho/tally-background/redux-slices"
import { fetchValueHistory } from "@tallyho/tally-background/redux-slices/history"
import type { ValueHistory } from "@tallyho/tally-background/services/history"
import { renderWithProviders } from "../../../tests/test-utils"
import FullTabValueChart from "../FullTabValueChart"

const NOW = Date.now()
const HOUR = 60 * 60 * 1000

const history: ValueHistory = {
  from: NOW - 3 * HOUR,
  points: [
    { time: NOW - 3 * HOUR, value: 100 },
    { time: NOW - 2 * HOUR, value: 110 },
    { time: NOW - HOUR, value: 120 },
  ],
  coverageStart: undefined,
  estimatedUntil: undefined,
  balanceHistoryFrom: undefined,
  reconstructedUntil: undefined,
  unrecorded: [],
  backfilling: false,
}

/**
 * Returns a store that answers history requests with the given history, the
 * way the background's history service answers them through webext-redux.
 */
const storeWithHistory = (answer: ValueHistory) =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(
        () => (next) => (action: AnyAction) =>
          action.type === fetchValueHistory.typePrefix
            ? Promise.resolve(answer)
            : next(action),
      ),
  })

// The plot only draws once it knows its width, which jsdom never measures.
class FixedWidthResizeObserver implements ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe(target: Element) {
    const contentRect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 200,
      width: 400,
      height: 200,
      toJSON: () => ({}),
    }
    this.callback(
      [
        {
          target,
          contentRect,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        },
      ],
      this,
    )
  }

  disconnect() {}

  unobserve() {}
}

const renderChart = (currentValue?: number) =>
  renderWithProviders(
    <FullTabValueChart
      addresses={["0x0"]}
      label="Total"
      currentValue={currentValue}
    />,
    { store: storeWithHistory(history) },
  )

describe("FullTabValueChart", () => {
  const originalResizeObserver = globalThis.ResizeObserver

  beforeAll(() => {
    globalThis.ResizeObserver = FixedWidthResizeObserver
  })

  afterAll(() => {
    globalThis.ResizeObserver = originalResizeObserver
  })

  it("ends on the latest recorded value without a current value", async () => {
    const ui = renderChart()

    await waitFor(() =>
      expect(ui.container.querySelector(".value")?.textContent).toBe("$120.00"),
    )
    expect(ui.container.querySelector(".change")?.textContent).toContain(
      "$20.00 (20.00%)",
    )
  })

  it("ends on the current value the page shows", async () => {
    const ui = renderChart(200)

    await waitFor(() =>
      expect(ui.container.querySelector(".value")?.textContent).toBe("$200.00"),
    )
    expect(ui.container.querySelector(".change")?.textContent).toContain(
      "▲ $100.00 (100.00%)",
    )

    // The y axis reaches the current value rather than stopping near the
    // latest recorded one.
    const axisValues = [...ui.container.querySelectorAll("text.axis")]
      .map(({ textContent }) => textContent ?? "")
      .filter((text) => text.startsWith("$"))
      .map((text) => Number(text.slice(1).replace(/,/g, "")))
    expect(Math.max(...axisValues)).toBeGreaterThanOrEqual(200)

    // The latest point keeps its time, so the screen reader table lists it
    // at the same row with the current value.
    const rows = [...ui.container.querySelectorAll("tbody tr")]
    expect(rows[rows.length - 1].querySelector("td")?.textContent).toBe(
      "$200.00",
    )

    // Hovering the plot's right edge picks the latest point, which reads the
    // current value too.
    const target = ui.container.querySelector("svg rect[fill='transparent']")
    if (!target) throw new Error("No pointer target")
    // jsdom has no PointerEvent, and fireEvent.pointerMove falls back to an
    // event that carries no pointer position. A MouseEvent carries one.
    fireEvent(
      target,
      new MouseEvent("pointermove", { bubbles: true, clientX: 10_000 }),
    )
    expect(ui.container.querySelector(".value")?.textContent).toBe("$200.00")
    expect(ui.container.querySelector(".when")).not.toBeNull()
  })
})
