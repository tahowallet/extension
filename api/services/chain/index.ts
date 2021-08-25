import PreferenceService from "../preferences/service"
import ChainService from "./service"

export { default as ChainService } from "./service"

const SCHEDULES = {
  queuedTransactions: {
    delayInMinutes: 1,
    periodInMinutes: 5,
  },
}

export async function startService(
  preferenceService: Promise<PreferenceService>
): Promise<ChainService> {
  const service = new ChainService(SCHEDULES, preferenceService)
  await service.startService()
  return service
}
