/*
 * A simple interface for service lifecycles.
 */
export interface Service {
  startService(): Promise<void>
  stopService(): Promise<void>
}
