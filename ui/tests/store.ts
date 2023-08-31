import { CombinedState, configureStore, EnhancedStore } from "@reduxjs/toolkit"
import rootReducer, { RootState } from "@tallyho/tally-background/redux-slices"

export const initializeStoreForTest = (
  preloadedState = {},
): EnhancedStore<CombinedState<RootState>> =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  })

export type ReduxStoreTypeForTest = ReturnType<typeof initializeStoreForTest>
