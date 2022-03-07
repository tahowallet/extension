import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"
import React, { useRef, useState } from "react"
import { useOnClickOutside } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import AccountItemRemovalConfirm from "./AccountItemRemovalConfirm"
import RemoveAddressLabel from "./AccountItemRemoveAddressLabel"

interface AccountItemOptionsMenuProps {
  hideMenu: boolean
  accountTotal: AccountTotal
  address: HexString
  isSelected: boolean
}

const AccountItemOptionsMenu: React.FC<AccountItemOptionsMenuProps> = ({
  hideMenu,
  accountTotal,
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
            account={accountTotal}
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
