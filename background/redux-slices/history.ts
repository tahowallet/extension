import { createBackgroundAsyncThunk } from "./utils"
import type { ValueHistory, ValueHistoryQuery } from "../services/history"

/**
 * Async thunk whose dispatch promise resolves to the value over time of the
 * queried accounts' holdings, as computed by the history service.
 *
 * Note that history isn't kept in the redux store; instead, each chart
 * requests the span it is currently showing.
 */
// oxlint-disable-next-line import/prefer-default-export
export const fetchValueHistory = createBackgroundAsyncThunk(
  "history/fetchValueHistory",
  async (
    query: ValueHistoryQuery,
    { extra: { main } },
  ): Promise<ValueHistory> => main.getValueHistory(query),
)
