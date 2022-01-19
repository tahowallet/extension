import React, { ReactElement } from "react"
import { Provider } from "react-redux"
import { Store } from "webext-redux"

/**
 * Entry point for UI shown in browser tabs.
 */
export default function Tab({ store }: { store: Store }): ReactElement {
  return (
    <>
      <Provider store={store}>Tally in a tab. Cool, eh?</Provider>
      <>
        <style jsx global>
          {`
            body {
              height: 100%;
            }
          `}
        </style>
      </>
    </>
  )
}
