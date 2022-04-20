import classNames from "classnames"
import React, { ReactElement } from "react"

interface AccountitemOptionLabelProps {
  hoverable?: boolean
  label: string
  icon: string
  color?: string
  hoverColor?: string
}

export default function AccountitemOptionLabel({
  hoverable,
  label,
  icon,
  color,
  hoverColor,
}: AccountitemOptionLabelProps): ReactElement {
  return (
    <div className={classNames("remove_address", { hover: hoverable })}>
      <div className="icon" />
      <span>{label}</span>
      <style jsx>{`
          .icon {
            mask-image: url("./images/${icon}");
            mask-size: cover;
            color: blue;
            background-color: ${color || "var(--green-20)"};
            width: 16px;
            margin-right: 5px;
            height: 16px;
          }
          .remove_address {
            display: flex;
            color: ${color || "var(--green-20)"};
            flexDirection: row;
            align-items: center;
            font-size: 16px;
            height: 100%;
            line-height 24px;
            font-weight: 500;
            width: 100%;
          }
          .hover:hover {
            color: ${hoverColor || "#fff"};
          }
          .hover:hover .icon {
            background-color: ${hoverColor || "#fff"};
          }
        `}</style>
    </div>
  )
}
AccountitemOptionLabel.defaultProps = {
  hoverable: false,
}
