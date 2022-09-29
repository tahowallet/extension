import React, { ReactElement } from "react"
import classNames from "classnames"
import SharedIcon from "./SharedIcon"
import { useAreKeyringsUnlocked } from "../../hooks/signing-hooks"

type Props = {
  shortenedAddress: string
  name: string | undefined
  avatarURL: string | undefined
  showHoverStyle: boolean
  showKeyring?: boolean
}

export default function SharedCurrentAccountInformation({
  shortenedAddress,
  name,
  avatarURL,
  showHoverStyle,
  showKeyring,
}: Props): ReactElement {
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const icon = areKeyringsUnlocked ? "un-lock" : "lock"
  return (
    <div className={classNames("account_info_wrap", { hover: showHoverStyle })}>
      <span className="account_info_label">{name ?? shortenedAddress}</span>
      <div className="avatar" />
      {showKeyring && (
        <div className="keyring_icon_wrap">
          <SharedIcon
            icon={`icons/s/${icon}-bold.svg`}
            width={18}
            color={`var(--${areKeyringsUnlocked ? "success" : "error"})`}
            ariaLabel={icon}
          />
        </div>
      )}
      <style jsx>
        {`
          .account_info_wrap {
            display: flex;
            align-items: center;
            font-weight: 500;
            position: relative;
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
          .keyring_icon_wrap {
            background-color: var(--hunter-green);
            padding: 0px 5px 3px 3px;
            border-radius: 2px;
            position: absolute;
            right: -16px;
            top: -10px;
          }
        `}
      </style>
    </div>
  )
}

SharedCurrentAccountInformation.defaultProps = {
  showHoverStyle: false,
}
