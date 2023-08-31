import { DexieOptions } from "dexie"
import Emittery from "emittery"

export interface ServiceLifecycleEvents {
  serviceStarted: void
  serviceStopped: void
}
// We use this type to represent "an Emittery event emitter without the
// any-event-related or debug methods". We do this because the onAny method,
// its siblings, and the debug method are locked to the specific set of events
// in Emittery's type parameter, but we want to be able to create more specific
// lists of type parameters and use them interchangeably. In particular, a
// Service<MyServiceEvents> should be interchangeable with a
// Service<ServiceLifecycleEvents> if MyServiceEvents extends
// ServiceLifecycleEvents. `onAny`'s typing does not allow this, so for the
// Service interface level we use a type that eliminates that method, and thus
// the problem.
type EmitteryWithoutAnyOrDebugSupport<T> = Omit<
  Emittery<T>,
  "anyEvent" | "onAny" | "offAny" | "debug"
>

/**
 * A simple interface for service lifecycles and event emission. Services
 * should emit a `serviceStarted` event when they are started, and a
 * `serviceStopped` event when they are stopped. It is strongly recommended
 * that all services have a single static `create` method to create but not
 * start the service. This method should adhere to `ServiceCreatorFunction` for
 * consistency.
 *
 * Services are generally considered to have three phases: created, started,
 * and stopped. Once services are created, they should have any internal and
 * local state initialized. Once started, they should have any external state,
 * such as subscriptions to external systems and polling set up. Events should
 * not be emitted before a service is started. This creates an ideal moment to
 * hook up event handlers _after_ the service has been created but _before_ it
 * has been started.
 *
 * Implementors, see {@link BaseService} for a good base class that handles
 * most of the lifecycle details.
 */
export interface Service<T extends ServiceLifecycleEvents> {
  /**
   * The emitter for service events. Services are generally expected to emit
   * events when any action of interest occurs.
   *
   * All services should emit a `serviceStarted` event when the service has
   * finished its start process, and a `serviceStopped` event when the service
   * has finished its stop process.
   */
  readonly emitter: EmitteryWithoutAnyOrDebugSupport<T>

  /**
   * Waits for any internal initialization to occur before fulfilling the
   * returned promise. The promise returns the same instance, so that it can be
   * chained. Calling `started` does _not_ start the service! Instead, it acts
   * as a hook for calling things once a service has been started.
   */
  started(): Promise<this>

  /**
   * Starts any internal monitoring, scheduling, etc and then resolves the
   * returned promise. May not wait for all data to be resolved before
   * resolving the returned promise, just for all relevant processes to be
   * kicked off. Events should only be emitted after a service is started.
   * This includes any initialization events that provide a starting view of
   * persisted data.
   *
   * Calling this method more than once should be a noop. Starting a service
   * that has already been started and stopped is not guaranteed to work.
   *
   * When the start process is complete, the `serviceStarted` event should be
   * emitted on the service's event emitter.
   *
   * @returns An immediately-resolved promise if the service is already
   *          started, otherwise a promise that will resolve once the service
   *          has finished starting.
   */
  startService(): Promise<void>

  /**
   * Stops any internal monitoring, scheduling, etc and then resolves the
   * returned promise. May not wait for all in-flight requests to be completed
   * before resolving the returned promise, just for all relevant scheduling to
   * be halted.
   *
   * Calling this method more than once should be a noop.
   *
   * When the stop process is complete, the `serviceStopped` event should be
   * emitted on the service's event emitter.
   *
   * @returns An immediately-resolved promise if the service is already
   *          stopped, otherwise a promise that will resolve once the service
   *          has finished stopping.
   */
  stopService(): Promise<void>
}

/**
 * A service creator function is in charge of doing internal initialization for
 * a given service, returning a promise to the ready-to-be-started service. The
 * service at this stage has not done any _external_ initialization; to do
 * this, the service's `startService` method must be invoked.
 *
 * The service creator also declares the particular other services that its
 * service depends on.
 */
export type ServiceCreatorFunction<
  EventsType extends ServiceLifecycleEvents,
  ServiceType extends Service<EventsType>,
  Deps extends Promise<Service<ServiceLifecycleEvents>>[],
> = (...serviceDependencies: [...Deps, DexieOptions?]) => Promise<ServiceType>
