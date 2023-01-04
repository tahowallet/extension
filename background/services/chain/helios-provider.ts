import { JsonRpcProvider } from "@ethersproject/providers"
import { Client } from "helios-ts"

// eslint-disable-next-line import/prefer-default-export
export class HeliosProvider extends JsonRpcProvider {
  isSynced = false

  client?: Client

  constructor(executionRpc?: string, consensusRpc?: string) {
    super()

    this.client = new Client(
      executionRpc ?? "http://localhost:9001/proxy",
      consensusRpc ?? "http://localhost:9002/proxy"
    )
  }

  // eslint-disable-next-line class-methods-use-this
  override send(method: string, params: Array<any>): Promise<any> {
    return Promise.reject(new Error(`yipikaye, ${method} - ${params}`))
  }
}
