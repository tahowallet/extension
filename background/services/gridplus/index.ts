import BaseService from "../base"
import { ServiceCreatorFunction, ServiceLifecycleEvents } from "../types"
import { storage } from "webextension-polyfill"
import { fetchAddresses, pair, setup } from "gridplus-sdk"

const APP_NAME = "Taho Wallet"
const CLIENT_STORAGE_KEY = "GRIDPLUS_CLIENT"
const ADDRESSES_STORAGE_KEY = "GRIDPLUS_ADDRESSES"

export type GridPlusAddress = {
  address: string
  addressIndex: number
}

type GridplusClient = string | null

interface Events extends ServiceLifecycleEvents {
  placeHolderEventForTypingPurposes: string
}

export default class GridplusService extends BaseService<Events> {
  activeAddresses: GridPlusAddress[] = []
  client: GridplusClient = null

  private constructor() {
    super()
    this.readClient()
    this.readAddresses()
  }

  static create: ServiceCreatorFunction<Events, GridplusService, []> =
    async () => new this()

  async readClient() {
    this.client =
      (await storage.local.get(CLIENT_STORAGE_KEY))?.[CLIENT_STORAGE_KEY] ??
      null
    return this.client
  }

  async writeClient(client: GridplusClient) {
    return storage.local.set({
      [CLIENT_STORAGE_KEY]: client,
    })
  }

  async readAddresses() {
    this.activeAddresses = JSON.parse(
      (await storage.local.get(ADDRESSES_STORAGE_KEY))?.[ADDRESSES_STORAGE_KEY],
    )
    return this.activeAddresses
  }

  async writeAddresses(addresses: GridPlusAddress[]) {
    return storage.local.set({
      [ADDRESSES_STORAGE_KEY]: JSON.stringify(addresses),
    })
  }

  async setupClient({
    deviceId,
    password,
  }: {
    deviceId?: string
    password?: string
  }) {
    return setup({
      deviceId,
      password,
      name: APP_NAME,
      getStoredClient: () => this.client ?? "",
      setStoredClient: this.writeClient,
    })
  }

  async pairDevice({ pairingCode }: { pairingCode: string }) {
    await this.readClient()
    return pair(pairingCode)
  }

  async fetchAddresses({
    n = 10,
    startPath = [0x80000000 + 44, 0x80000000 + 60, 0x80000000, 0, 0],
  }: {
    n?: number
    startPath?: number[]
  }) {
    await this.readClient()
    return fetchAddresses({ n, startPath })
  }

  async importAddresses({ addresses }: { addresses: GridPlusAddress[] }) {
    addresses.forEach((address) => {
      this.activeAddresses.push(address)
    })
    await this.writeAddresses(this.activeAddresses)
  }
}
