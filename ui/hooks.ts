import { RootState, BackgroundDispatch } from "@tallyho/tally-background"

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"

export const useBackgroundDispatch = (): BackgroundDispatch =>
  useDispatch<BackgroundDispatch>()
export const useBackgroundSelector: TypedUseSelectorHook<RootState> =
  useSelector
