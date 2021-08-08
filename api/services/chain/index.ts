import PreferenceService from "../preferences/service"
import ChainService from "./service"

export default async function startService(
  preferenceService: PreferenceService
): Promise<ChainService> {
  const service = new ChainService(preferenceService)
  await service.startService()
  return service
}
