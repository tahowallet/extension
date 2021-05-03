import { EventEmitter } from 'events'
import { createId } form './id'

type f = (any: any) => any

export interface ProxyPort {
  send: (message: any) => void
  ready: () => void
  subscribe: (f: f) => void
  unsubscribe: (f: f) => boolean
  destroy: () => void
  raw: any
}

export function createPortProxy (port: any): ProxyPort {

}
