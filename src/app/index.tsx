import { createElement } from 'react'
import { render } from 'react-dom'
import { useDispatch } from 'react-redux'

import { configureProxyStore } from '../store'
import { Root } from './components'

// const store = configureStore({})

// export type AppDispatch = typeof store.dispatch
// export const useAppDispatch = () => useDispatch<AppDispatch>()

export async function startApp(initialState : any, container: any) {
  // get store data from the background script store
  const store = configureProxyStore(initialState)

  render(<Root store={store} />, container)

  return store
}
