import { render } from 'react-dom'
import { useDispatch } from 'react-redux'

import Root from '@mechamittens/extension/ui/app/pages'

import { configureProxyStore } from '../store'

// const store = configureStore({})

// export type AppDispatch = typeof store.dispatch
// export const useAppDispatch = () => useDispatch<AppDispatch>()

async function startApp(initialState : any) {
  // get store data from
  const store = configureProxyStore({})
}
