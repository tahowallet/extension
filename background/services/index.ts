import Emittery from "emittery"

export type {
  ServiceLifecycleEvents,
  Service,
  ServiceCreatorFunction,
} from "./types"

export { default as BaseService } from "./base"
export { default as ChainService } from "./chain"
export { default as EnrichmentService } from "./enrichment"
export { default as IndexingService } from "./indexing"
export { default as InternalSignerService } from "./internal-signer"
export { default as NameService } from "./name"
export { default as PreferenceService } from "./preferences"
export { default as ProviderBridgeService } from "./provider-bridge"
export { default as InternalEthereumProviderService } from "./internal-ethereum-provider"
export { default as DoggoService } from "./doggo"
export { default as TelemetryService } from "./telemetry"
export { default as LedgerService } from "./ledger"
export { default as SigningService } from "./signing"
export { default as AnalyticsService } from "./analytics"
export { default as NFTsService } from "./nfts"
export { default as WalletConnectService } from "./wallet-connect"

export function getNoopService<T>(): T {
  return Promise.resolve({
    startService: () => Promise.resolve(),
    stopService: () => Promise.resolve(),
    emitter: new Emittery(),
  }) as unknown as T
}
