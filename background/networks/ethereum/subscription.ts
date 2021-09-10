import { EventEmitter } from "events"
import { TRANSPORT_TYPES } from "../../constants"
import logger from "../../lib/logger"

/*

  This class is a handler for managing a single subscriptions events.

*/

export default class Subscription extends EventEmitter {
  name: string

  id: string

  constructor(name: string, id: string) {
    super()
    this.id = id
    this.name = name
  }

  handler(message: { data: string }) {
    try {
      const response = JSON.parse(message.data)
      if (!response) return
      const { params, method } = response
      if (!method) return
      if (method === "eth_subscription") {
        if (!params) return
        const { subscription, result } = params
        if (subscription !== this.id) return
        if (!result) return
        this.emit("update", result)
      }
    } catch (e) {
      logger.error(e)
    }
  }
}
