// For design considerations see https://github.com/tallycash/tally-extension/blob/main/docs/inpage.md
import EventEmitter from "events"

// it's better to have our own copy of these functions so nobody
// can temper w / them in any way we would not want to
// (lot of script does this kind of magic eg ads logging)
const windowPostMessage = window.postMessage
const windowAddEventListener = window.addEventListener

console.log("inpage.js in da house")

export class InpageEip1193Bridge extends EventEmitter {
  request(request: { method: string; params?: Array<any> }): Promise<any> {
    return this.send(request.method, request.params || [])
  }

  async send(method: string, params?: Array<any>): Promise<any> {
    // ‼️ Always include target origin to avoid unwanted attention
    windowPostMessage(
      {
        target: "content",
        payload: {
          method,
          params,
        },
      },
      window.location.origin
    )
    return new Promise((resolve) => {
      function listener(event: {
        origin: string
        source: unknown
        data: { target: string; payload: { result: unknown } }
      }) {
        if (
          event.origin !== window.location.origin || // we want to recieve msgs only from the inpage script
          event.source !== window || // we want to recieve msgs only from the inpage script
          event.data.target !== "inpage" // TODO: needs a better solution
        )
          return

        console.log("inpage: ", JSON.stringify(event.data))

        resolve(event.data.payload)
      }
      windowAddEventListener("message", listener)
    })
  }
}

;(window as any).ethereum = new InpageEip1193Bridge()
