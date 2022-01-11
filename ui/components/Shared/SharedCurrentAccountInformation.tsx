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
      {name?.includes(".") ? name : shortenedAddress}
      <div className="avatar" />
      <style jsx>
        {`
          .account_info_wrap {
            display: flex;
            align-items: center;
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
          .hover:hover {
            color: var(--green-20);
          }
          .hover:hover .avatar {
            border: solid 2px var(--hunter-green);
            outline: solid 2px var(--trophy-gold);
            margin-right: -2px;
            margin-left: 6px;
          }
        `}
      </style>
    </div>
  )
}

SharedCurrentAccountInformation.defaultProps = {
  showHoverStyle: false,
}
