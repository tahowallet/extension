import React, { ReactElement } from "react"

export default function TopMenuProfileTooltip(props: {
  copyAddress: () => void
}): ReactElement {
  const { copyAddress } = props

  return (
    <button type="button" className="tooltip" onClick={copyAddress}>
      <span className="tooltip_label">Copy address</span>
      <span className="tooltip_icon" />
      <style jsx>{`
        .tooltip {
          display: flex;
          align-items: center;
          position: absolute;
          z-index: 999999999;
          cursor: pointer;
          bottom: -30px;
          right: 0;
          background-color: var(--green-120);
          padding: 8px 10px 8px;
          border-radius: 8px;
          color: var(--green-5);
        }
        .tooltip:hover {
          color: var(--trophy-gold);
        }
        .tooltip_label {
          white-space: nowrap;
          font-size: 16px;
          line-height: 24px;
        }
        .tooltip_icon {
          mask-image: url("./images/copy@2x.png");
          mask-size: cover;
          width: 24px;
          height: 24px;
          margin-left: 10px;
          display: inline-block;
          background-color: var(--green-5);
        }
        .tooltip:hover .tooltip_icon {
          background-color: var(--trophy-gold);
        }
      `}</style>
    </button>
  )
}
