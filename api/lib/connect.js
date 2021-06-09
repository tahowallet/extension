import { platform } from './platform'
import { createPortProxy } from './port-proxy'



export function connectToBackgroundApi({ name }) {
  const port = platform.runtime.connect({ name })
  return createPortProxy(port)
}