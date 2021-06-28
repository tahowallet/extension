import { TRANSPORT_TYPES } from '../../constants'

export default class BlockTracker {
  constructor ({ provider, initStart }) {
    this.provider = provider
    if (initStart) this.start()
  }

  start () {
    if (provider.type === TRANSPORT_TYPES.ws) {}
  }

  stop () {
    if (provider.type === TRANSPORT_TYPES.ws) {}
  }
}