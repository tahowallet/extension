import {
  Store,
} from 'webext-redux'

type ScopedProxyStoreConfig = ConstructorParameters<typeof Store>[0] & { scope: string }

class ScopedProxyStore extends Store {

  state : any
  scope : string

  constructor(options : ScopedProxyStoreConfig) {
    super(options)
    this.scope = options.scope
  }

  getState() {
    return this.state[this.scope]
  }
}
