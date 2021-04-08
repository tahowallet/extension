import logger from 'redux-logger'
import createSagaMiddleware from 'redux-saga'

import { configureBackgroundStore as _configureBackgroundStore, configureScopedProxyStore as _configureProxyStore } from '@tallyho/webext-redux-toolkit'

import mechamittensReducer from '@mechamittens/ui/app/ducks'

export type MechaMittensState = ReturnType<typeof mechamittensReducer>

export function configureBackgroundStore(preloadedState) :
  [ReturnType<typeof _configureBackgroundStore>, ReturnType<typeof createSagaMiddleware>] {
  const sagaMiddleware = createSagaMiddleware()
  const store = _configureBackgroundStore({
    devTools: process.env.NODE_ENV !== 'production',
    reducer: {
      mechamittens: mechamittensReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger).concat(sagaMiddleware),
    preloadedState,
  })
  return [store, sagaMiddleware]
}

export const configureProxyStore = () => {
  const store = _configureProxyStore({
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    scope: 'mechamittens',
  })
  return store
}
