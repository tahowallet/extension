import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"
import classNames from "classnames"
import React, { useRef, useState } from "react"
import { useOnClickOutside } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import AccountItemRemovalConfirm from "./AccountItemRemovalConfirm"

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

interface AccountItemOptionsMenuProps {
  hideMenu: boolean
  account: AccountTotal
  address: HexString
  isSelected: boolean
}

const AccountItemOptionsMenu: React.FC<AccountItemOptionsMenuProps> = ({
  hideMenu,
  account,
  address,
  isSelected,
}) => {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showAddressRemoveConfirm, setShowAddressRemoveConfirm] =
    useState(false)
  const optionsMenuRef = useRef(null)
  useOnClickOutside(optionsMenuRef, () => {
    setShowOptionsMenu(false)
  })
  if (hideMenu) {
    return <></>
  }
  return (
    <>
      <SharedSlideUpMenu
        size="custom"
        customSize="336px"
        isOpen={showAddressRemoveConfirm}
        close={() => {
          setShowAddressRemoveConfirm(false)
        }}
      >
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "default" }}
        >
          <AccountItemRemovalConfirm
            address={address}
            account={account}
            isSelected={isSelected}
            close={() => setShowAddressRemoveConfirm(false)}
          />
        </div>
      </SharedSlideUpMenu>
      <button
        type="button"
        className="icon_settings"
        role="menu"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === "enter") {
            setShowOptionsMenu(true)
          }
        }}
        onClick={(e) => {
          e.stopPropagation()
          setShowOptionsMenu(true)
        }}
      />

      {showOptionsMenu && (
        <ul ref={optionsMenuRef} className="options">
          <li className="option">
            <button
              className="remove_address"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowOptionsMenu(false)
                setShowAddressRemoveConfirm(true)
              }}
            >
              <RemoveAddressLabel hoverable />
            </button>
            <button
              type="button"
              className="icon_close"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation()
                setShowOptionsMenu(false)
              }}
            />
          </li>
        </ul>
      )}
      <style jsx>
        {`
          .icon_settings {
            background: url("./images/more_dots@2x.png") center no-repeat;
            background-size: cover;
            width: 4px;
            height: 20px;
            margin-left: 16px;
            border: 10px solid transparent;
          }
          .options {
            position: absolute;
            right: 0;
            height: 48px;
            background-color: var(--green-120);
            display: flex;
            align-items: center;
            flex-direction: row;
            justify-content: space-between;
            width: 212px;
            padding: 10px;
            border-radius: 4px;
          }
          .option {
            display: flex;
            flex-direction: row;
            width: 100%;
            align-items: center;
            justify-content: space-between;
          }
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            width: 11px;
            height: 11px;
            padding: 2.5px;
            background-color: var(--green-20);
            z-index: 1;
          }
        `}
      </style>
    </>
  )
}

export default AccountItemOptionsMenu
