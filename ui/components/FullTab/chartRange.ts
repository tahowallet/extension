import {
  ChartRange,
  selectChartRange,
  setChartRange,
} from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

const HOUR = 60 * 60 * 1000
export const DAY = 24 * HOUR

/** The ranges value charts offer, with how much history each one shows. */
export const RANGES = [
  { key: "day", span: DAY, format: "HH:mm" },
  { key: "week", span: 7 * DAY, format: "MMM D" },
  { key: "month", span: 30 * DAY, format: "MMM D" },
  { key: "quarter", span: 90 * DAY, format: "MMM D" },
  { key: "year", span: 365 * DAY, format: "MMM YYYY" },
  // Back to when the charted holdings were first held; the span is worked
  // out with the history, so it isn't fixed here.
  { key: "all", span: undefined, format: "MMM YYYY" },
] as const satisfies readonly {
  key: ChartRange
  span: number | undefined
  format: string
}[]

export type RangeKey = ChartRange

/**
 * Returns the value charts' range and a function to change it. The range is a
 * UI setting in the store, so every chart opens with the last range picked on
 * any of them, including after the full tab is reopened.
 */
export function useChartRange(): [RangeKey, (rangeKey: RangeKey) => void] {
  const dispatch = useBackgroundDispatch()
  const rangeKey = useBackgroundSelector(selectChartRange)
  return [rangeKey, (next) => dispatch(setChartRange(next))]
}
