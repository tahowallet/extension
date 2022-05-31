import TallyWindowProvider from "@tallyho/window-provider"
import { Contract, ethers, ContractInterface } from "ethers"
import Emittery from "emittery"
import TallyWeb3Provider from "../../tally-provider"

type InternalProviderPortEvents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any
}

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */
// This is a compatibility shim that allows treating the internal provider as
// if it's communicating over a port, so that the TallyWindowProvider can
// interact with it directly.
export const internalProviderPort = {
  listeners: [] as ((message: any) => unknown)[],
  emitter: new Emittery<InternalProviderPortEvents>(),
  addEventListener(listener: (message: any) => unknown): void {
    this.listeners.push(listener)
  },
  removeEventListener(toRemove: (message: any) => unknown): void {
    this.listeners = this.listeners.filter((listener) => listener !== toRemove)
  },
  origin: window.location.origin,
  postMessage(message: any): void {
    this.emitter.emit("message", message)
  },
  postResponse(message: any): void {
    this.listeners.forEach((listener) => listener(message))
  },
}
/* eslint-enable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

export const internalProvider = new TallyWindowProvider(internalProviderPort)

export function getProvider(this: unknown): TallyWeb3Provider {
  return new TallyWeb3Provider(internalProvider)
}

export const getContract = async (
  address: string,
  abi: ContractInterface
): Promise<Contract> => {
  const provider = getProvider()
  const signer = provider.getSigner()
  return new ethers.Contract(address, abi, signer)
}

export const getSignerAddress = async (): Promise<string> => {
  const provider = getProvider()
  const signer = provider.getSigner()
  const signerAddress = await signer.getAddress()
  return signerAddress
}

export const getCurrentTimestamp = async (): Promise<number> => {
  const provider = getProvider()
  const { timestamp } = await provider.getBlock(provider.getBlockNumber())
  return timestamp
}
