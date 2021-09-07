import Emittery from "emittery"

/*
 * A simple interface for service lifecycles and event emission.
 */
export interface Service<T> {
  emitter: Emittery<T>
  startService(): Promise<void>
  stopService(): Promise<void>
}
