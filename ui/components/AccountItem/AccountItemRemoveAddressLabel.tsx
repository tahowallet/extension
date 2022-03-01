import classNames from "classnames"
import React from "react"

interface RemoveAddressProps {
  hoverable?: boolean
}

const RemoveAddressLabel: React.FC<RemoveAddressProps> = ({ hoverable }) => {
  return (
    <div className={classNames("remove_address", { hover: hoverable })}>
      <div className="icon_garbage" />
      <span>Remove address?</span>
      <style jsx>{`
          .icon_garbage {
            background: url("./images/garbage@2x.png") center no-repeat;
            background-size: cover;
            filter: brightness(0) saturate(100%) invert(39%) sepia(31%) saturate(7451%) hue-rotate(333deg) brightness(100%) contrast(83%);
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
            line-height 24px;
            font-weight: bold;
            width: 100%;
          }
          .hover:hover {
            color: var(--error-80);
          }
          .hover:hover .icon_garbage {
            filter: brightness(0) saturate(100%) invert(61%) sepia(6%) saturate(4092%) hue-rotate(309deg) brightness(109%) contrast(89%); 
          }
        `}</style>
    </div>
  )
}
RemoveAddressLabel.defaultProps = {
  hoverable: false,
}

export default RemoveAddressLabel
