import React, { ReactElement } from "react"

interface FeeSettingsButtonProps {
  openModal: () => void
  currentFeeSelected: string
  minFee: number
  maxFee: number
}

export default function FeeSettingsButton({
  openModal,
  currentFeeSelected,
  minFee,
  maxFee,
}: FeeSettingsButtonProps): ReactElement {
  return (
    <button
      className="settings"
      type="button"
      onClick={openModal}
      style={{
        background: `linear-gradient(90deg, var(--green-80) ${(
          ((Number(currentFeeSelected) || minFee) / maxFee) *
          100
        ).toFixed()}%, rgba(0, 0, 0, 0) ${(
          ((Number(currentFeeSelected) || minFee) / maxFee) *
          100
        ).toFixed()}%)`,
      }}
    >
      <div>
        ~{currentFeeSelected || minFee}
        Gwei
      </div>
      <img className="settings_image" src="./images/cog@2x.png" alt="" />
      <style jsx>
        {`
          .settings {
            height: 38px;
            display: flex;
            align-items: center;
            color: var(--gold-5);
            font-size: 16px;
            line-height: 24px;
            border-radius: 4px;
            padding-left: 8px;
            border: 1px solid #33514e;
          }
          .settings_image {
            width: 14px;
            height: 14px;
            padding: 0 8px;
          }
        `}
      </style>
    </button>
  )
}
