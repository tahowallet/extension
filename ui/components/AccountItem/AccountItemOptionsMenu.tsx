import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"
import React, { ReactElement, useRef, useState } from "react"
import { useOnClickOutside } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import AccountItemRemovalConfirm from "./AccountItemRemovalConfirm"
import RemoveAddressLabel from "./AccountItemRemoveAddressLabel"

type AccountItemOptionsMenuProps = {
  accountTotal: AccountTotal
  address: HexString
}

export default function AccountItemOptionsMenu({
  accountTotal,
  address,
}: AccountItemOptionsMenuProps): ReactElement {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showAddressRemoveConfirm, setShowAddressRemoveConfirm] =
    useState(false)
  const optionsMenuRef = useRef(null)
  useOnClickOutside(optionsMenuRef, () => {
    setShowOptionsMenu(false)
  })

  return (
    <>
      <SharedSlideUpMenu
        size="custom"
        customSize="336px"
        isOpen={showAddressRemoveConfirm}
        close={(e) => {
          e?.stopPropagation()
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
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <ul
          ref={optionsMenuRef}
          className="options"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
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
            mask-image: url("./images/more_dots@2x.png");
            mask-repeat: no-repeat;
            mask-position: center;
            background-color: var(--green-60);
            mask-size: 20%;
            width: 4px;
            height: 20px;
            border: 10px solid transparent;
          }
          .icon_settings:hover {
            background-color: var(--green-40);
          }
          .remove_address_button {
            flex-grow: 2;
          }
          .options {
            position: absolute;
            right: 8;
            cursor: default;
            border-radius: 4px;
            background-color: var(--green-120);
            display: flex;
            align-items: center;
            flex-direction: row;
            justify-content: space-between;
            width: 212px;
            border-radius: 4px;
          }
          .option {
            display: flex;
            line-height: 24px;
            padding: 14px;
            flex-direction: row;
            width: 100%;
            align-items: center;
            height: 100%;
            cursor: default;
            justify-content: space-between;
          }
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            margin-right -2px;
            width: 11px;
            height: 11px;
            background-color: var(--green-40);
            z-index: 1;
          }
          .icon_close:hover {
            background-color: var(--green-20);
          }
        `}
      </style>
    </>
  )
}
