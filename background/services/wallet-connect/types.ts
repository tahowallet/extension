import { RPCRequest } from "@tallyho/provider-bridge-shared"

export interface TranslatedRequestParams {
  id: number
  topic: string
  method: string
  params: RPCRequest["params"]
}
