import { createElement } from 'react'
import { render } from 'react-dom'
import { Provider, useDispatch } from 'react-redux'

import { configureProxyStore } from '../store'
import { App } from './components'

// const store = configureStore({})

// export type AppDispatch = typeof store.dispatch
// export const useAppDispatch = () => useDispatch<AppDispatch>()

export async function startApp(container: any) {
  const store = configureProxyStore()

  // render once data from the background script store is loaded
  store.ready().then(() => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
      container
    )
  })
}
