import React, { ReactElement, useState } from "react"
import CorePage from "../components/Core/CorePage"
import SharedAssetInput from "../components/Shared/SharedAssetInput"
import SharedButton from "../components/Shared/SharedButton"
import SharedNetworkFeeGroup from "../components/Shared/SharedNetworkFeeGroup"

export default function Send(): ReactElement {
  const [selectedCount, setSelectedCount] = useState(0)

  return (
    <>
      <CorePage>
        <div className="standard_width">
          <h1 className="header">
            <span className="icon_activity_send_medium" />
            <div className="title">Send Asset</div>
          </h1>
          <div className="form">
            <div className="form_input">
              <label className="label">
                Asset / Amount <span className="label_right">Max</span>
                <SharedAssetInput
                  onClick={() => {
                    setSelectedCount(1)
                  }}
                />
              </label>
            </div>
            <div className="form_input">
              <label className="label">
                Send To:
                <SharedAssetInput isTypeDestination />
              </label>
            </div>
            <span className="label">Network Fee/Speed</span>
            <SharedNetworkFeeGroup />
            <div className="divider" />
            <div className="total_footer standard_width_padded">
              <div className="total_amount">
                <div className="total_label">Total</div>
                <div className="total_amount_number">0.0</div>
              </div>
              <SharedButton
                type="primary"
                size="large"
                label="Send"
                isDisabled={selectedCount <= 0}
              />
            </div>
          </div>
        </div>
      </CorePage>
      <style jsx>
        {`
          .icon_activity_send_medium {
            background: url("./images/activity_send_medium@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 8px;
          }
          .title {
            width: 113px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .header {
            display: flex;
            align-items: center;
            margin-bottom: 25px;
            margin-top: 17px;
          }
          .form_input {
            margin-bottom: 22px;
          }
          .label {
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-bottom: 5px;
            margin-left: 7px;
            display: flex;
            justify-content: space-between;
          }
          .label_right {
            margin-right: 6px;
          }
          .total_amount_number {
            width: 150px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .total_footer {
            display: flex;
            justify-content: space-between;
            margin-top: 21px;
            padding-bottom: 20px;
          }
          .total_label {
            width: 33px;
            height: 17px;
            color: var(--green-60);
            font-family: Segment;
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .divider {
            width: 384px;
            border-bottom: 1px solid #000000;
            margin-left: -16px;
          }
        `}
      </style>
    </>
  )
}
