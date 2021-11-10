// @ts-nocheck

// For design considerations see https://github.com/tallycash/tally-extension/blob/main/docs/inpage.md
import EventEmitter from "events"
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin"

// it's better to have our own copy of these functions so nobody
// can temper w / them in any way we would not want to
// (lot of script does this kind of magic eg ads logging)
const windowPostMessage = window.postMessage
const windowAddEventListener = window.addEventListener
const removeEventListener = window.removeEventListener

console.log("inpage.js in da house")
export class InpageEip1193Bridge extends EventEmitter {
  chainId: number | undefined = 1 // TODO: get this from bg
  selectedAddress: string | undefined
  isConnected = false
  isTally = true
  isMetaMask = true
  listeners = new Map()

  async request(request: {
    method: string
    params?: Array<any>
  }): Promise<any> {
    return this.send(request.method, request.params || [])
  }

  async send(method: string, params?: Array<any>): Promise<any> {
    const sendData = {
      id: Date.now().toString(),
      target: "content",
      payload: {
        method,
        params,
      },
    }

    console.log("---")
    console.log("inpage: ", JSON.stringify(sendData))

    // ‼️ Always include target origin to avoid unwanted attention
    windowPostMessage(sendData, window.location.origin)

    return new Promise((resolve) => {
      function listener(event: {
        origin: string
        source: unknown
        data: { target: string; payload: { result: unknown } }
      }) {
        if (
          event.origin !== window.location.origin || // we want to recieve msgs only from the inpage script
          event.source !== window || // we want to recieve msgs only from the inpage script
          event.data.target !== "inpage"
        )
          return

        if (sendData.id !== event.data.id) return

        removeEventListener("message", this.listeners.get(sendData.id), false)
        this.listeners.delete(sendData.id)

        const { method, params } = sendData.payload
        const { result } = event.data.payload
        console.log("inpage: ", JSON.stringify(event.data))
        if (method === "eth_chainId") {
          if (!this.isConnected) {
            this.isConnected = true
            this.emit("connect", { chainId: result })
          }

          if (this.chainId !== result) {
            this.chainId = result
            this.emit("chainChanged", result)
            this.emit("networkChanged", result)
          }
        }

        if (method === "eth_accounts") {
          if (this.selectedAddress !== result[0]) {
            this.selectedAddress = result[0]
            this.emit("accountsChanged", [this.selectedAddress])
          }
        }

        resolve(result)
        console.log(this.listeners.size)
        return
      }

      this.listeners.set(sendData.id, listener.bind(this))
      windowAddEventListener("message", this.listeners.get(sendData.id))
    })
  }
}

;(window as any).ethereum = new InpageEip1193Bridge()
