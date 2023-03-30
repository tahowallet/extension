import React, { ReactElement } from "react"

type Props = {
  illustration: string
  title: string
  subtitle: string
  children: ReactElement
}

export default function ImportForm(props: Props): ReactElement {
  const { children, title, subtitle, illustration } = props
  return (
    <>
      <div className="centered fadeIn">
        <form
          className="centered"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <div className="section">
            <div className="illustration_import" />
            <h1 className="serif_header">{title}</h1>
            <div className="info">{subtitle}</div>
          </div>
          {children}
        </form>
      </div>
      <style jsx>{`
        form {
          all: unset;
        }
        .serif_header {
          font-size: 36px;
          line-height: 42px;
          margin-bottom: 8px;
        }
        .centered {
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: space-between;
          width: 356px;
          margin: auto;
        }
        h1 {
          margin: unset;
        }
        .section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .illustration_import {
          background: url("./images/${illustration}");
          background-size: cover;
          width: 85px;
          height: 83px;
          margin-bottom: 15px;
        }
        .info {
          margin-bottom: 40.5px;
          width: 320px;
          text-align: center;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
          font-weight: 500;
        }
      `}</style>
    </>
  )
}
