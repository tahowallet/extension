import React, { ReactElement, useState } from "react"
import { useRouteMatch, Redirect } from "react-router-dom"
import SharedButton from "../../../components/Shared/SharedButton"

export default function Intro(): ReactElement {
  const [redirectToAddWallet] = useState(false)

  const { path } = useRouteMatch()

  if (redirectToAddWallet) {
    return <Redirect push to={`${path}/add-wallet`} />
  }

  return (
    <section className="fadeIn">
      <header>
        <div className="illustration" />
        <h1>Let&apos;s get you setup!</h1>
      </header>
      <div className="actions">
        <SharedButton
          type="primary"
          size="large"
          linkTo={`${path}/add-wallet`}
          center
          style={{
            fontSize: "20px",
            lineHeight: "24px",
            fontWeight: 500,
          }}
        >
          Use existing wallet
        </SharedButton>
        <SharedButton
          type="secondary"
          size="large"
          linkTo={`${path}/new-seed/set-password`}
          center
          style={{
            fontSize: "20px",
            lineHeight: "24px",
            fontWeight: 500,
          }}
        >
          Create new wallet
        </SharedButton>
      </div>
      <style jsx>
        {`
          section {
            max-width: 348px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 65px;
            justify-content: center;
            align-items: center;
            --fade-in-duration: 300ms;
          }

          .illustration {
            background: url("./images/doggo_intro.svg");
            background-size: cover;
            width: 80px;
            height: 80px;
            margin: 0 auto;
          }

          header {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          header h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            margin: 0;
          }

          .actions {
            width: 100%;
            box-sizing: border-box;
            border-radius: 16px;
            background: var(--green-95);
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 28px;
          }
        `}
      </style>
    </section>
  )
}
