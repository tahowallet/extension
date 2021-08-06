import PreferenceService from "./service"

export default async function startService(): Promise<PreferenceService> {
  const service = new PreferenceService()
  await service.startService()
  return service
}
