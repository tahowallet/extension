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

export default async function startService(
  preferenceService: PreferenceService
): Promise<IndexingService> {
  const service = new IndexingService(SCHEDULES, preferenceService)
  await service.startService()
  return service
}
