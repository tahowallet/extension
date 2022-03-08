import classNames from "classnames"
import React from "react"

interface RemoveAddressProps {
  hoverable?: boolean
}

const RemoveAddressLabel: React.FC<RemoveAddressProps> = ({ hoverable }) => {
  return (
    <div className={classNames("remove_address", { hover: hoverable })}>
      <div className="icon_garbage" />
      <span>Remove address</span>
      <style jsx>{`
          .icon_garbage {
            mask-image: url("./images/garbage@2x.png");
            mask-size: cover;
            color: blue;
            background-color: var(--error);
            width: 16px;
            margin-right: 5px;
            height: 16px;
          }
          .remove_address {
            display: flex;
            flexDirection: row;
            align-items: center;
            color: var(--error);
            font-size: 18px;
            height: 100%;
            line-height 24px;
            font-weight: bold;
            width: 100%;
          }
          .hover:hover {
            color: var(--error-80);
          }
          .hover:hover .icon_garbage {
            background-color: var(--error-80);
          }
        `}</style>
    </div>
  )
}
RemoveAddressLabel.defaultProps = {
  hoverable: false,
}

export default RemoveAddressLabel
