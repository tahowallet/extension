import { getErrorType } from "../errors"
import type { NetworkReachabilityTracker } from "../network-reachability"
import {
  recordRequestFailed,
  recordRequestSent,
  recordRequestSucceeded,
} from "../../../lib/perf-metrics"
import type Endpoint from "./endpoint"
import type { RequestOutcomeObserver, RpcRequest } from "./failover-executor"

/**
 * Feeds the reachability tracker. Only requests the executor runs count, so
 * cached answers never vouch for the chain.
 */
export function reachabilityObserver(
  tracker: NetworkReachabilityTracker,
): RequestOutcomeObserver {
  return {
    onEndpointSuccess: () => tracker.recordSuccess(),
    onAllEndpointsFailed: () => tracker.recordExhaustedWalk(),
  }
}

/**
 * Records request metrics: sends and failures against the endpoint a request
 * started on, successes against the endpoint that answered.
 */
export function performanceMetricsObserver(
  chainID: string,
  metricsIndexOf: (endpoint: Endpoint) => number,
  now: () => number = Date.now,
): RequestOutcomeObserver {
  const startingIndexes = new WeakMap<RpcRequest, number>()

  return {
    onRequestStarted(request, pool) {
      const index = metricsIndexOf(pool.preferredEndpoint)
      startingIndexes.set(request, index)
      recordRequestSent(chainID, index)
    },
    onEndpointSuccess(request, endpoint) {
      recordRequestSucceeded(
        chainID,
        metricsIndexOf(endpoint),
        now() - request.startedAt,
      )
    },
    onRequestFailed(request, error) {
      recordRequestFailed(
        chainID,
        startingIndexes.get(request) ?? 0,
        getErrorType(String(error), request.method),
      )
    },
  }
}
