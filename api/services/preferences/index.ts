import PreferenceService from "./service"

export type { default as PreferenceService } from "./service"

export async function startService(): Promise<PreferenceService> {
  const service = new PreferenceService()
  await service.startService()
  return service
}
