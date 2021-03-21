// eslint-disable-next-line import/no-unassigned-import
// import './options-storage'

// TODO set up our data connections
// TODO manage account watchers

import { all, spawn } from 'redux-saga/effects'

import { configureBackgroundStore } from '../store'
import appSaga from '../sagas'

import initialMechamittensState from './exampleState.json'

// TODO load up state from persistence or get new extension state
// TODO store persistence via saga

const [store, sagaMiddleware] = configureBackgroundStore(loadState())

type State = ReturnType<typeof store.getState>

function loadState() : State {
  // TODO get JSON from the local extension storage
  // TODO state versioning

  return {
    mechamittens: initialMechamittensState
  }
}

function* persistStoreSaga() {
  // TODO every second, save the state
}

function persistState(state : State) {
}

function* rootSaga() {
  yield all([
    spawn(persistStoreSaga),
    spawn(appSaga)
  ])
}

sagaMiddleware.run(appSaga)
