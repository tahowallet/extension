import { ChainService } from ".."
import { browser } from "../.."
import { ETHEREUM } from "../../constants"

//TODO: change to normal service implementation
export async function dumbContentScriptProviderPortService(
  chainService: ChainService
) {
  console.log("dumbcontentscriptproviderportservice")

  console.log("onconnect")

  browser.runtime.onConnect.addListener(async (port) => {
    // if (port?.sender?.tab && port?.sender?.url) { // TODO: put this back
    console.log("let's create listener")
    port.onMessage.addListener(async ({ id, target, payload }) => {
      console.log("---")
      if (target !== "background") return
      console.log(`background: request payload: ${JSON.stringify(payload)}`)
      const response = {
        target: "content",
        payload: await provider(payload.method, payload.params),
        id: id,
      }
      console.log("background response:", response)

      port.postMessage(response)
    })
    // }
  })

  async function provider(method: string, params?: Array<any>): Promise<any> {
    switch (method) {
      case "eth_accounts":
      case "eth_requestAccounts": // TODO: get current account from redux store
        return chainService
          .getAccountsToTrack()
          .then(([acc]) => ({ result: [acc.account] }))
      case "net_version":
      case "eth_chainId":
        return Promise.resolve({ result: "0x1" })
      //   return chainService
      //     .getAccountsToTrack()
      //     .then(([acc]) => ({ result: acc.network.chainID }))
      case "eth_getBalance":
        return Promise.resolve({ result: "0x8ef30df72da000" })
      case "eth_call":
        return Promise.resolve({
          result:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        })

      case "eth_blockNumber":
        return Promise.resolve({ result: "0xcf5fef" })
      case "eth_gasPrice":
      case "eth_getStorageAt":
      case "eth_getTransactionCount":
      case "eth_getBlockTransactionCountByHash":
      case "eth_getBlockTransactionCountByNumber":
      case "eth_getCode":
      case "eth_sendRawTransaction":
      case "estimateGas":
      case "eth_getBlockByHash":
      case "eth_getBlockByNumber":
      case "eth_getTransactionByHash":
      case "eth_getTransactionReceipt":
      case "eth_sign":
      case "eth_sendTransaction":
      case "eth_getUncleCountByBlockHash":
      case "eth_getUncleCountByBlockNumber":
      case "eth_getTransactionByBlockHashAndIndex":
      case "eth_getTransactionByBlockNumberAndIndex":
      case "eth_getUncleByBlockHashAndIndex":
      case "eth_getUncleByBlockNumberAndIndex":
      case "eth_newFilter":
      case "eth_newBlockFilter":
      case "eth_newPendingTransactionFilter":
      case "eth_uninstallFilter":
      case "eth_getFilterChanges":
      case "eth_getFilterLogs":
      case "eth_getLogs":
        break
    }

    throw {
      name: "UNSUPPORTED_OPERATION",
      message: `unsupported method: ${method}`,
      stack: JSON.stringify(
        {
          method: method,
          params: params,
        },
        null,
        2
      ),
    }
  }
}
