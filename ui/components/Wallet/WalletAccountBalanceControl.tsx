import React, { ReactElement, useState } from "react"
import { Link } from "react-router-dom"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"

interface Props {
  balance?: string
}

export default function WalletAccountBalanceControl(
  props: Props
): ReactElement {
  const { balance } = props
  const [openReceiveMenu, setOpenReceiveMenu] = useState(false)
  const [hasSavedSeed, setHasSavedSeed] = useState(
    window.localStorage.getItem("hasSavedSeed")
  )

  function handleClick() {
    setOpenReceiveMenu(!openReceiveMenu)
  }

  return (
    <>
      <SharedSlideUpMenu isOpen={openReceiveMenu} close={handleClick}>
        {Receive()}
      </SharedSlideUpMenu>
      <div className="wrap">
        <div className="balance_label">Total account balance</div>
        <span className="balance_area">
          {balance && (
            <span className="balance fade_in">
              <span className="dollar_sign">$</span>
              {balance}
            </span>
          )}
        </span>

        {hasSavedSeed ? (
          <div className="send_receive_button_wrap">
            <Link to="/send">
              <SharedButton
                label="Send"
                icon="send"
                size="medium"
                type="primary"
              />
            </Link>
            <SharedButton
              label="Receive"
              onClick={handleClick}
              icon="receive"
              size="medium"
              type="primary"
            />
          </div>
        ) : (
          <div className="save_seed_button_wrap">
            <Link to="/onboarding/2">
              <SharedButton
                label="First, secure your recovery seed"
                icon="arrow_right"
                iconSize="large"
                size="large"
                type="warning"
              />
            </Link>
          </div>
        )}
      </div>
      <style jsx>
        {`
          .wrap {
            height: 146px;
            display: flex;
            justify-contnet: space-between;
            align-items: center;
            flex-direction: column;
          }
          .balance_area {
            height: 48px;
          }
          .balance {
            color: #ffffff;
            font-size: 36px;
            font-weight: 500;
            line-height: 48px;
            display: flex;
            align-items: center;
          }
          .send_receive_button_wrap {
            margin-top: 18px;
            display: flex;
            width: 223px;
            justify-content: space-between;
          }
          .balance_label {
            width: 160px;
            height: 24px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
          }
          .dollar_sign {
            width: 14px;
            height: 32px;
            color: var(--green-40);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            margin-right: 4px;
            margin-left: -14px;
          }
          .save_seed_button_wrap {
            margin-top: 10px;
          }
        `}
      </style>
    </>
  )
}

WalletAccountBalanceControl.defaultProps = {
  balance: "",
}
