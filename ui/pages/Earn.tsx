import React, { ReactElement } from "react"
import CorePage from "../components/Core/CorePage"

export default function Earn(): ReactElement {
  return (
    <>
      <CorePage>
        <span className="title">Earn</span>
      </CorePage>
      <style jsx>
        {`
          .title {
            width: 375px;
            height: 46px;
            color: #fefefc;
            font-family: "Quincy CF";
            font-size: 38px;
            font-weight: 400;
            text-align: center;
          }
        `}
      </style>
    </>
  )
}
