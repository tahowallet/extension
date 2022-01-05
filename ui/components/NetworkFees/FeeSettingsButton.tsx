import React, { ReactElement } from "react"

interface FeeSettingsButtonProps {
  openModal: () => void
  currentFeeSelected: string
}

export default function FeeSettingsButton({
  openModal,
  currentFeeSelected,
}: FeeSettingsButtonProps): ReactElement {
  return (
    <button className="settings" type="button" onClick={openModal}>
      <div>
        ~{currentFeeSelected}
        Gwei
      </div>
      <img className="settings_image" src="./images/cog@2x.png" alt="" />
      <style jsx>
        {`
          .settings {
            height: 32px;
            display: flex;
            align-items: center;
            color: var(--gold-5);
            font-size: 16px;
            line-height: 20px;
            border-radius: 4px;
            padding-left: 4px;
            border: 1px solid #33514e;
            transition: all 0.3s ease;
          }
          .settings_image {
            width: 14px;
            height: 14px;
            padding: 0 8px;
            transition: all 0.3s ease;
          }
          .settings:hover {
            border: 1px solid #578f89;
          }
          .settings:hover .settings_image {
            filter: brightness(1.5);
          }
        `}
      </style>
    </button>
  )
}
