import PreferenceService from "../preferences/service"
import ChainService from "../chain/service"
import IndexingService from "./service"

export { default as IndexingService } from "./service"

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

export async function startService(
  preferenceService: Promise<PreferenceService>,
  chainService: Promise<ChainService>
): Promise<IndexingService> {
  const service = new IndexingService(
    SCHEDULES,
    preferenceService,
    chainService
  )
  await service.startService()
  return service
}
