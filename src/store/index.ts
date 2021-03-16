import logger from 'redux-logger'
import createSagaMiddleware from 'redux-saga'

import { configureBackgroundStore as _configureBackgroundStore, configureProxyStore as _configureProxyStore } from '@tallyho/webext-redux-toolkit'

import mechamittensReducer from '@mechamittens/extension/ui/app/ducks'

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
    state: preloadedState,
    portName: 'tally.port.name',
    extensionId: null,
  })
  return [store, sagaMiddleware]
}

export const configureProxyStore = (preloadedState) => {
  const store =_configureProxyStore({
    state: preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
    portName: 'tally.port.name',
  })
  // const oldGetState = store.getState
  // store.getState = () => store.state.metamask || {}
  return store
}
