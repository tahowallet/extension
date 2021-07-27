import { TRANSPORT_TYPES } from '../../constants'

export default class BlockTracker {
  constructor (public provider : any, initStart : boolean) {
    if (initStart) {
      this.start()
    }
  }

  start () {
    if (this.provider.type === TRANSPORT_TYPES.ws) {}
  }

  stop () {
    if (this.provider.type === TRANSPORT_TYPES.ws) {}
  }
}
