import {
  ChainService,
  PreferenceService,
  LedgerService,
  KeyringService,
  SigningService,
} from "../services"

export const createPreferenceService = async (): Promise<PreferenceService> => {
  return PreferenceService.create()
}

export const createChainService = async (): Promise<ChainService> => {
  return ChainService.create(createPreferenceService())
}

export const createLedgerService = async (): Promise<LedgerService> => {
  return LedgerService.create()
}

export const createKeyringService = async (): Promise<KeyringService> => {
  return KeyringService.create()
}

type CreateSigningServiceOverrides = {
  keyringService?: Promise<KeyringService>
  ledgerService?: Promise<LedgerService>
  chainService?: Promise<ChainService>
}

export const createSigningService = async (
  overrides: CreateSigningServiceOverrides = {}
): Promise<SigningService> => {
  return SigningService.create(
    overrides.keyringService ?? createKeyringService(),
    overrides.ledgerService ?? createLedgerService(),
    overrides.chainService ?? createChainService()
  )
}
