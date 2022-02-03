import React, { ReactElement } from "react"
import SharedButton from "../components/Shared/SharedButton"

export default function ErrorFallback(): ReactElement {
  return (
    <>
      <div className="wrap">
        <h1 className="serif_header">Unexpected Error</h1>
        <SharedButton type="primary" size="medium" linkTo="/">
          Return Home
        </SharedButton>
      </div>
      <style jsx>{`
        .wrap {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        h1 {
          margin-bottom: 20px;
        }
      `}</style>
    </>
  )
}
