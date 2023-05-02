import React, { ReactElement } from "react"
import classNames from "classnames"
import SharedIcon from "./SharedIcon"
import { useAreInternalSignersUnlocked } from "../../hooks/signing-hooks"

type Props = {
  shortenedAddress: string
  name: string | undefined
  avatarURL: string | undefined
  showHoverStyle: boolean
  showLockStatus?: boolean
}

export default function SharedCurrentAccountInformation({
  shortenedAddress,
  name,
  avatarURL,
  showHoverStyle,
  showLockStatus,
}: Props): ReactElement {
  const areInternalSignersUnlocked = useAreInternalSignersUnlocked(false)
  const icon = areInternalSignersUnlocked ? "unlock" : "lock"
  return (
    <div className={classNames("account_info_wrap", { hover: showHoverStyle })}>
      <span className="account_info_label ellipsis">
        {name ?? shortenedAddress}
      </span>
      <div className="avatar" />
      {showLockStatus && (
        <div data-testid="lock" className="lock_icon_wrap">
          <SharedIcon
            icon={`icons/s/${icon}-bold.svg`}
            width={16}
            color={`var(--${areInternalSignersUnlocked ? "success" : "error"})`}
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
            min-width: 0; // Allow the account address/name to collapse to an ellipsis.
          }
          .avatar {
            border-radius: 12px;
            width: 32px;
            height: 32px;
            margin-left: 8px;
            background: url("${avatarURL ?? "./images/portrait.png"}");
            background-color: var(--green-40);
            background-size: cover;
            flex-shrink: 0;
          }
          .hover:hover .account_info_label {
            color: var(--trophy-gold);
          }
          .lock_icon_wrap {
            background-color: var(--hunter-green);
            padding: 2px 6px 4px 2px;
            border-radius: 8px;
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
