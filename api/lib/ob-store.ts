import { EventEmitter } from 'events'

export default class ObStore extends EventEmitter {
  _state : any

  constructor (initState = {}) {
    super()
    this._state = initState
  }

  // returns current state
  getState () {
    return this._state
  }

  // replaces previous state with new state
  putState (state) {
    this._state = state
    this.emit('update', state)
  }

  /*spreads new/partial state object on top of previous state object*/
  updateState (newState) {
    this._state = {...this._state, ...newState}
    this.emit('update', this._state)
  }
}
