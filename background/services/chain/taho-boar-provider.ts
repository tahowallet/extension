import TahoRPCProvider from "./taho-rpc-provider"

const PROVIDER_REQUEST_TIMEOUT = 5000

/**
 * Boar RPC provider for enhanced API methods (token balances, transfers, etc.)
 * and standard JSON-RPC calls.
 *
 * Uses a single Boar RPC URL that handles chain routing on the backend.
 */
export default class TahoBoarProvider extends TahoRPCProvider {
  constructor(boarRpcUrl: string) {
    super({
      url: boarRpcUrl,
      throttleLimit: 1,
      timeout: PROVIDER_REQUEST_TIMEOUT,
      fetchOptions: {
        credentials: "omit",
      },
    })
  }
}
