import Provider from './provider'
import Subscription from './subscription'
import { EventEmitter } from 'events'


/*
  should do caching
*/



export default class EthereumNetworkProvider extends Provider {
  constructor ({ endpoint }) {
    super({ endpoint })
    this.subscriptions = {}
  }

  // handler only for unsubscrib
  async request (request, handler) {
    if (request.method === 'eth_subscribe') {
      const params = request.params
      const [ name ] = params
      const subscription = this.subscriptions[name]
      if (subscription) return subscription.id
      if (!this.socket) await this.connect()

      const id = await super.request(request)
      this.subscriptions[name] = new Subscription({ name, id })
      this.socket.addEventListener('message', this.subscriptions[name].handler.bind(this.subscriptions[name]))
      return id
    } else if (request.method === 'eth_unsubscribe') {
      const params = request.params
      const [ name ] = params
      if (!this.subscriptions[name]) return
      const subscription = this.subscriptions[name]
      if (handler) subscription.removeListener('update', handler)
      if (!subscription.listeners('update').length) {
        this.socket.removeEventListener('message', subscription.handler.bind(subscription))
        const confirmation = await super.request({ method: 'eth_unsubscribe', params: [subscription.id] })
        return confirmation
      }
      return true
    } else {
      return await super.request(request)
    }
  }

  async connect () {
    const socket = await super.connect()
    this.subscriptions
    return socket
  }

  async close () {
    Object.keys(this.subscriptions).forEach((name) => {
      this.socket.removeEventListener('message', this.subscriptions[name].handler.bind(this.subscriptions[name]))
    })
    await super.close()
  }
}