import { schema } from './schema'
import Provider from './provider'

/*

opts = {
  ...providerOpts,
  timeingType: 'block' || 'cpu'
}
*/

export class ProviderWithCache extends Provider {
  constructor (opts) {
    const { timeingType = 'cpu' } = opts
    super(opts)
    this.cached = {}
  }

  async request (request, escapeCache) {
    if (escapeCache) return await super.request(request)
  }
}
