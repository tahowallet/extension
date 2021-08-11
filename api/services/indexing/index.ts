import PreferenceService from "../preferences/service"
import IndexingService from "./service"

const SCHEDULES = {
  tokens: {
    delayInMinutes: 1,
    periodInMinutes: 30,
  },
  prices: {
    delayInMinutes: 1,
    periodInMinutes: 10,
  },
}

export { default as IndexingService } from "./service"

export async function startService(
  preferenceService: Promise<PreferenceService>
): Promise<IndexingService> {
  const service = new IndexingService(SCHEDULES, preferenceService)
  await service.startService()
  return service
}
