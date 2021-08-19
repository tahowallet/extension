import React, { ReactElement } from "react"
import CorePage from "../components/Core/CorePage"

export default function Earn(): ReactElement {
  return (
    <>
      <CorePage>
        <header>
          <div className="left">
            <div className="pre_title">Total value locked</div>
            <div className="balance">23,928,292</div>
          </div>
          <div className="right">
            <div className="pre_title">24h Change</div>
            <div className="percentage">+12%</div>
          </div>
        </header>
        <section className="standard_width">
          <h3>Your deposits</h3>
          <div className="cards_wrap">{Array(2).fill("").map(FarmCard)}</div>
        </section>
        <section className="standard_width">
          <h3>Earn 1</h3>
          <div className="cards_wrap">{Array(2).fill("").map(FarmCard)}</div>
        </section>
      </CorePage>
      <style jsx>
        {`
          h3 {
            color: var(--green-40);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .cards_wrap {
            display: flex;
            justify-content: space-between;
            margin-top: -10px;
          }
          .pre_title {
            color: var(--green-40);
            font-size: 14px;
            line-height: 16px;
            margin-bottom: 7px;
          }
          .balance {
            text-shadow: 0 2px 2px #072926;
            color: #fff;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
          }
          .percentage {
            color: #11bea9;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: right;
          }
          header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            background: url("./images/graph@2x.png") center no-repeat;
            background-size: cover;
            overflow: visible;
            padding: 17px 16px 76px 16px;
            box-sizing: border-box;
            align-items: flex-start;
            margin-bottom: -65px;
          }
          .right {
            display: flex;
            justify-content: flex-end;
            flex-direction: column;
          }
        `}
      </style>
    </>
  )
}
