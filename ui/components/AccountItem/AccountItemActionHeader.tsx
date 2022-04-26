import React, { ReactElement } from "react"

interface AccountItemActionHeaderProps {
  label: string
  icon: string
  color?: string
}

export default function AccountItemActionHeader({
  label,
  icon,
  color,
}: AccountItemActionHeaderProps): ReactElement {
  return (
    <div className="action_header">
      <div className="icon" />
      <span>{label}</span>
      <style jsx>{`
          .icon {
            mask-image: url("./images/${icon}");
            mask-size: cover;
            background-color: ${color || "#fff"};
            width: 16px;
            margin-right: 5px;
            height: 16px;
          }
          .action_header {
            display: flex;
            color: ${color || "#fff"};
            flexDirection: row;
            align-items: center;
            font-size: 18px;
            font-weight: 600;
            height: 100%;
            line-height 24px;
            width: 100%;
          }
        `}</style>
    </div>
  )
}
