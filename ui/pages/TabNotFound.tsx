import React, { ReactElement } from "react"

export default function TabNotFound(): ReactElement {
  return (
    <>
      <div>
        <p>This page does not exist. That&apos;s all we know.</p>
      </div>
      <style jsx>{`
        div {
          display: flex;
          min-height: 100%;
        }
        p {
          margin: auto;
        }
      `}</style>
    </>
  )
}
