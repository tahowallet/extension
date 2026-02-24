import React, { PropsWithChildren } from "react"
import { render } from "@testing-library/react"
import type { RenderOptions } from "@testing-library/react"
import type { PreloadedState } from "@reduxjs/toolkit"
import { Provider } from "react-redux"
import { RootState } from "@tallyho/tally-background"
import { initializeStoreForTest, ReduxStoreTypeForTest } from "./store"

interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  preloadedState?: PreloadedState<RootState>
  store?: ReduxStoreTypeForTest
}

// oxlint-disable-next-line import/prefer-default-export, typescript/explicit-module-boundary-types
export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = initializeStoreForTest(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <Provider store={store}>{children}</Provider>
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) }
}
