import React, { ReactElement } from "react"
// import { useTranslation } from "react-i18next"
import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"

export default function WalletBanner(): ReactElement {
  //   const { t } = useTranslation()

  return (
    <div className="wallet_banner_container">
      <SharedBanner>
        <div className="wallet_banner">
          <SharedIcon
            icon="icons/s/close.svg"
            ariaLabel="close"
            width={16}
            color="var(--green-40)"
            hoverColor="var(--green-20)"
            customStyles={`
              position: absolute;
              top: 0;
              right: 0;
            `}
          />
          <img src="./images/avatars/atos@2x.png" alt="Notification campaign" />
          <div className="wallet_banner_content">
            <h3>Odyssey week 8 is live!</h3>
            <p>Featuring 1inch.</p>
            <div className="wallet_banner_buttons">
              <SharedButton
                style={{ height: "auto" }}
                size="medium"
                type="tertiary"
                iconSmall="new-tab"
                onClick={() => {
                  window.open(`https://galxe.com/arbitrum`, "_blank")?.focus()
                }}
              >
                Start now
              </SharedButton>
              <SharedButton
                style={{ height: "auto", marginLeft: "auto" }}
                size="medium"
                type="tertiaryGray"
                iconSmall="new-tab"
                onClick={() => {
                  window.open(`https://galxe.com/arbitrum`, "_blank")?.focus() // TODO: this should be changed when the explainer is created
                }}
              >
                Learn more
              </SharedButton>
            </div>
          </div>
        </div>
      </SharedBanner>
      <style jsx>{`
        img {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          margin: 0 15px 0 5px;
        }
        h3 {
          margin: 0 0 5px;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          margin-right: 25px;
        }
        p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          color: var(--green-40);
        }
        .wallet_banner_container {
          margin: 10px 0 25px;
        }
        .wallet_banner {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .subtitle {
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }
        .wallet_banner_content {
          width: 100%;
        }
        .wallet_banner_buttons {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          margin-top: 5px;
        }
      `}</style>
    </div>
  )
}
