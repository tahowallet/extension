import React, { ReactElement } from "react"
import classNames from "classnames"

type Props = {
  shortenedAddress: string
  name: string | undefined
  avatarURL: string | undefined
  showHoverStyle: boolean
}

export default function SharedCurrentAccountInformation({
  shortenedAddress,
  name,
  avatarURL,
  showHoverStyle,
}: Props): ReactElement {
  return (
    <div className={classNames("account_info_wrap", { hover: showHoverStyle })}>
      <span className="account_info_label">
        {name?.includes(".") ? name : shortenedAddress}
      </span>
      <div className="avatar" />
      <style jsx>
        {`
          .account_info_wrap {
            display: flex;
            align-items: center;
            font-weight: 500;
          }
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            margin-left: 8px;
            background: url("${avatarURL ?? "./images/portrait.png"}");
            background-color: var(--green-40);
            background-size: cover;
          }
          .hover:hover .account_info_label {
            color: var(--trophy-gold);
          }
        `}
      </style>
    </div>
  )
}

SharedCurrentAccountInformation.defaultProps = {
  showHoverStyle: false,
}
