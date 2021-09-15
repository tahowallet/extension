import KeyringService from "./service"

export { default as KeyringService } from "./service"

export async function startService(): Promise<KeyringService> {
  const service = new KeyringService()
  await service.startService()
  return service
}
