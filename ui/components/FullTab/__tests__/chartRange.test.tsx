import React, { ReactElement } from "react"
import { fireEvent } from "@testing-library/react"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import { renderWithProviders } from "../../../tests/test-utils"
import { initializeStoreForTest } from "../../../tests/store"
import { useChartRange } from "../chartRange"

function RangePicker({ id }: { id: string }): ReactElement {
  const [rangeKey, setRangeKey] = useChartRange()
  return (
    <button
      type="button"
      data-testid={id}
      onClick={() => setRangeKey("quarter")}
    >
      {rangeKey}
    </button>
  )
}

describe("useChartRange", () => {
  it("opens with the range stored in settings", () => {
    const store = initializeStoreForTest({
      ui: {
        ...uiInitialState,
        settings: { ...uiInitialState.settings, chartRange: "year" },
      },
    })
    const ui = renderWithProviders(<RangePicker id="chart" />, { store })

    expect(ui.getByTestId("chart").textContent).toBe("year")
  })

  it("keeps every chart on the range last picked", () => {
    const ui = renderWithProviders(
      <>
        <RangePicker id="first" />
        <RangePicker id="second" />
      </>,
    )
    expect(ui.getByTestId("second").textContent).toBe("month")

    fireEvent.click(ui.getByTestId("first"))

    expect(ui.getByTestId("first").textContent).toBe("quarter")
    expect(ui.getByTestId("second").textContent).toBe("quarter")
    expect(ui.store.getState().ui.settings.chartRange).toBe("quarter")
  })
})
