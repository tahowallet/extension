import Provider from './provider'
import Subscription from './subscription'
import { EventEmitter } from 'events'


/*
  should do caching
*/

export default class EthereumNetworkProvider extends Provider {
  constructor ({ endpoint }) {
    super({ endpoint })
    this.cache = {}
    this.subscriptions = {}
    this._subscriptionIds = {}
  }

  // handler only for unsubscribe
  async request (request, handler) {
    const params = request.params
    if (request.method === 'eth_subscribe') {
      const [ name ] = params
      const subscription = this.subscriptions[name]
      if (subscription) return subscription.id
      if (!this.socket) await this.connect()

      const id = await super.request(request)
      // map for subcription id's
      this._subscriptionIds[id] = name
      // acctual subcription interface
      this.subscriptions[name] = new Subscription({ name, id })
      this.socket.addEventListener('message', this.subscriptions[name].handler.bind(this.subscriptions[name]))
      return id
    } else if (request.method === 'eth_unsubscribe') {
      const params = request.params
      const [ id ] = params
      const name = this._subscriptionIds[id]
      if (!this.subscriptions[name]) return false
      const subscription = this.subscriptions[name]
      // removes listener and if their are no subcriptions left unsubcribes from the node
      if (handler) subscription.removeListener('update', handler)
      if (!subscription.listeners('update').length) {
        this.socket.removeEventListener('message', subscription.handler.bind(subscription))
        const confirmation = await super.request({ method: 'eth_unsubscribe', params: [subscription.id] })
        return confirmation
      }
      return true
    } else {
      // cache response and return cache response
      // cache is rest on every new head
      let key
      if (!params || !params.length) key = request.method
      else key = [request.method, ...params].join('/')

      if(!this.cache[key]) {
        this.cache[key] = await super.request(request)
      }

      return this.cache[key]
    }
  }

  async connect () {
    const socket = await super.connect()
    // subcscribe to new heads for caching purposes
    await this.request({
      method: 'eth_subscribe',
      params: ['newHeads'],
    })
    this.subscriptions.newHeads.on('update', (state) => {
      this.cache = {
        eth_blockNumber: state.number
      }
    })
    return socket
  }

  async close () {
    Object.values(this.subscriptions).forEach((subscription) => {
      try {
        subscription.removeAllListners('update')
        this.socket.removeEventListener('message',subscription.handler.bind(subscription))
        this.request({ method: 'eth_unsubscribe', params: [subscription.id] })
      } catch (e) {
        console.error(e)
      }
    })
    await super.close()
  }
}
