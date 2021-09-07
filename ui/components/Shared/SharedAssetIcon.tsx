import React, { ReactElement } from "react"

interface Props {
  size?: "small" | "medium" | "large"
}

export default function SharedAssetIcon(props: Props): ReactElement {
  const { size } = props

  return (
    <div className={`token_icon_wrap ${size}`}>
      <span className="icon_eth" />
      <style jsx>
        {`
          .token_icon_wrap {
            width: 40px;
            height: 40px;
            background-color: var(--castle-black);
            border-radius: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon_eth {
            background: url("./images/eth@2x.png");
            background-size: cover;
            width: 18px;
            height: 29px;
          }
          .small {
            width: 32px;
            height: 32px;
          }
          .small .icon_eth {
            width: 16px;
            height: 24px;
          }
          .large {
            width: 48px;
            height: 48px;
          }
        `}
      </style>
    </div>
  )
}

SharedAssetIcon.defaultProps = {
  size: "medium",
}
