import { TRANSPORT_TYPES } from '../../constants'

import { EventEmitter } from 'events'



/*

  This class is a handler for managing a single subscriptions events.

*/





export default class Subscription extends EventEmitter {
  constructor ({ name, id }) {
    super()
    this.id = id
    this.name = name
  }

  handler (message) {
    try {
      const response = JSON.parse(message.data)
      if (!response) return
      const { params, method } = response
      if (!method) return
      if (method === 'eth_subscription') {
        if (!params) return
        const { subscription, result } = params
        if (subscription !== this.id) return
        if (!result) return
        this.emit('update', result)
      }
    } catch (e) {
      console.error(e)
    }
  }

}