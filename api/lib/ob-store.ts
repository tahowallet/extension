import { EventEmitter } from 'events'

export default class ObStore<T> extends EventEmitter {
  _state : T

  constructor (initState : T) {
    super()
    this._state = initState
  }

  // returns current state
  getState() : T {
    return this._state
  }

  // replaces previous state with new state
  putState(state : T) {
    this._state = state
    this.emit('update', state)
  }

  /*spreads new/partial state object on top of previous state object*/
  updateState(newState : Partial<T>) {
    this._state = {...this._state, ...newState}
    this.emit('update', this._state)
  }
}
