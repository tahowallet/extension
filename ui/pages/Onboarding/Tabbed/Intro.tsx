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
    <section>
      <div className="illustration_section">
        <div className="illustration" />
        <div className="forest" />
      </div>
      <div className="bottom_part">
        <div className="bottom_content">
          <h1 className="bottom_title">Let&apos;s get you setup!</h1>
        </div>
        <div className="button_container">
          <SharedButton
            type="primary"
            size="large"
            linkTo={`${path}/add-wallet`}
          >
            <div className="option standard_width">Use existing wallet</div>
          </SharedButton>
          <SharedButton
            type="secondary"
            size="large"
            linkTo={`${path}/new-seed/set-password`}
          >
            <div className="option standard_width">Create new wallet</div>
          </SharedButton>
        </div>
      </div>
      <style jsx>
        {`
          .bottom_content {
            margin-top: 28px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .button_container {
            border-radius: 1em;
            background: var(--green-95);
            padding: 1em;
            margin: 3em 0;
            width: 100%;
          }
          .illustration_section {
            height: 180px;
            display: flex;
            padding-top: 68.5px;
            position: relative;
          }
          section {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 46px;
            line-height: 42px;
            margin: 12px 0px 0px 0px;
          }
          p {
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            color: var(--green-40);
            width: 336px;
            text-align: center;
            margin-top: 5px;
          }
          .bottom_part {
            display: flex;
            margin-top: -38px;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            height: 230px;
            text-align: center;
            z-index: 1;
          }
          .illustration {
            background: url("./images/doggo_grey@2x.png");
            background-size: cover;
            width: 120px;
            height: 120px;
            flex-shrink: 0;
            left: 0;
            right: 0;
            margin: 0 auto;
            margin-top: 0;
            position: absolute;
            animation: fadeIn ease 0.5s;
          }
          .forest {
            background-size: cover;
            width: 384px;
            height: 141px;
            align-self: flex-end;
            justify-self: flex-end;
            z-index: 1;
          }
          @keyframes fadeIn {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
        `}
      </style>
    </section>
  )
}
