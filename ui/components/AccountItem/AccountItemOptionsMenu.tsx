import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useRef, useState } from "react"
import { useOnClickOutside } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import AccountItemEditName from "./AccountItemEditName"
import AccountitemOptionLabel from "./AccountItemOptionLabel"
import AccountItemRemovalConfirm from "./AccountItemRemovalConfirm"

type AccountItemOptionsMenuProps = {
  accountTotal: AccountTotal
}

export default function AccountItemOptionsMenu({
  accountTotal,
}: AccountItemOptionsMenuProps): ReactElement {
  const { address, network } = accountTotal
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showAddressRemoveConfirm, setShowAddressRemoveConfirm] =
    useState(false)
  const [showEditName, setShowEditName] = useState(false)
  const optionsMenuRef = useRef(null)
  useOnClickOutside(optionsMenuRef, () => {
    setShowOptionsMenu(false)
  })

  return (
    <div className="options_menu_warp">
      <SharedSlideUpMenu
        size="custom"
        customSize="304px"
        isOpen={showEditName}
        close={(e) => {
          e?.stopPropagation()
          setShowEditName(false)
        }}
      >
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "default" }}
        >
          <AccountItemEditName
            addressOnNetwork={{ address, network }}
            account={accountTotal}
            close={() => setShowEditName(false)}
          />
        </div>
      </SharedSlideUpMenu>
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
                setShowEditName(true)
              }}
            >
              <AccountitemOptionLabel
                icon="icons/s/edit.svg"
                label="Edit name"
                hoverable
              />
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
              <AccountitemOptionLabel
                icon="garbage@2x.png"
                label="Remove address"
                hoverable
                color="var(--error)"
                hoverColor="var(--error-80)"
              />
            </button>
          </li>
        </ul>
      )}
      <style jsx>
        {`
          .options_menu_warp {
            position: relative;
          }
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
            right: 6px;
            top: -6px;
            cursor: default;
            border-radius: 4px;
            background-color: var(--green-120);
            display: flex;
            align-items: center;
            flex-direction: column;
            justify-content: space-between;
            width: 212px;
            border-radius: 4px;
          }
          .option {
            display: flex;
            line-height: 24px;
            padding: 14px;
            flex-direction: row;
            width: 90%;
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
    </div>
  )
}
