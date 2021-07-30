import { EventEmitter } from "events"

export default class ObStore<T> extends EventEmitter {
  private state: T

  constructor(initState: T) {
    super()
    this.state = initState
  }

  // returns current state
  getState(): T {
    return this.state
  }

  // replaces previous state with new state
  putState(state: T) {
    this.state = state
    this.emit("update", state)
  }

  /* spreads new/partial state object on top of previous state object */
  updateState(newState: Partial<T>) {
    this.state = { ...this.state, ...newState }
    this.emit("update", this.state)
  }
}
