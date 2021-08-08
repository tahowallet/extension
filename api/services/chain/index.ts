import PreferenceService from "../preferences/service"
import ChainService from "./service"
export { default as ChainService } from "./service"

export async function startService(
  preferenceService: Promise<PreferenceService>
): Promise<ChainService> {
  const service = new ChainService(preferenceService)
  await service.startService()
  return service
}
