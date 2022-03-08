import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"
import React, { useRef, useState } from "react"
import { useOnClickOutside } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import AccountItemRemovalConfirm from "./AccountItemRemovalConfirm"
import RemoveAddressLabel from "./AccountItemRemoveAddressLabel"

type AccountItemOptionsMenuProps = {
  hideMenu: boolean
  accountTotal: AccountTotal
  address: HexString
  isSelected: boolean
}

export default function AccountItemOptionsMenu({
  hideMenu,
  accountTotal,
  address,
  isSelected,
}: AccountItemOptionsMenuProps) {
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
        <ul
          ref={optionsMenuRef}
          className="options"
          onMouseOver={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        >
          <li className="option">
            <button
              className="remove_address_button"
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
              className="close_button"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation()
                setShowOptionsMenu(false)
              }}
            >
              <div className="icon_close" />
            </button>
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
          .close_button {
            height: 62px;
          }
          .remove_address_button {
            flex-grow: 2;
            height: 62px;
          }
          .options {
            position: absolute;
            right: 8;
            border-radius: 4px;
            height: 42px;
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
            margin-right: 5px;
            background-color: var(--green-20);
            z-index: 1;
          }
        `}
      </style>
    </>
  )
}
