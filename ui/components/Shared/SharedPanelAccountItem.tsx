import React, { ReactElement, useRef, useState } from "react"

import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { useDispatch } from "react-redux"
import { HexString } from "@tallyho/tally-background/types"
import { removeAccount } from "@tallyho/tally-background/redux-slices/accounts"
import classNames from "classnames"

import SharedLoadingSpinner from "./SharedLoadingSpinner"
import SharedSlideUpMenu from "./SharedSlideUpMenu"
import SharedButton from "./SharedButton"
import { useOnClickOutside } from "../../hooks"

interface Props {
  isSelected: boolean
  accountTotal: AccountTotal
  hideMenu: boolean
  address: HexString
}

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

export default function SharedPanelAccountItem(props: Props): ReactElement {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showAddressRemoveConfirm, setShowAddressRemoveConfirm] =
    useState(false)
  const optionsMenuRef = useRef(null)
  useOnClickOutside(optionsMenuRef, () => {
    setShowOptionsMenu(false)
  })
  const dispatch = useDispatch()
  const { isSelected, hideMenu, accountTotal: account, address } = props
  const {
    shortenedAddress,
    name,
    avatarURL,
    localizedTotalMainCurrencyAmount,
  } = account

  return (
    <li className="standard_width">
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
          <div className="remove_address_option">
            <RemoveAddressLabel />
            <ul>
              <li className="account_container">
                <SharedPanelAccountItem
                  accountTotal={account}
                  address={address}
                  hideMenu
                  isSelected={isSelected}
                />
              </li>
            </ul>
            <div className="remove_address_details">
              <span>
                Removing this address does not delete it from your seed phrase.
              </span>
              <span>
                It just hides it from the extension and you won&apos;t be able
                to use it until you add it back
              </span>
            </div>
            <div className="button_container">
              <SharedButton
                type="secondary"
                size="medium"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAddressRemoveConfirm(false)
                }}
              >
                Cancel
              </SharedButton>
              <SharedButton
                type="primary"
                size="medium"
                onClick={(e) => {
                  e.stopPropagation()
                  dispatch(removeAccount(address))
                  setShowAddressRemoveConfirm(false)
                }}
              >
                Yes, I want to remove it
              </SharedButton>
            </div>
          </div>
        </div>
      </SharedSlideUpMenu>
      <div className="left">
        {isSelected ? (
          <div className="avatar_selected_outline">
            <div className="avatar" />
          </div>
        ) : (
          <div className="avatar" />
        )}

        <div className="info">
          <div className="address_name">
            {typeof name === "undefined" ? shortenedAddress : name}
          </div>
          <div className="address">
            {typeof name !== "undefined" ? shortenedAddress : ""}
          </div>
        </div>
      </div>
      <div className="right">
        <div className="balance_status">
          {typeof localizedTotalMainCurrencyAmount === "undefined" ? (
            <SharedLoadingSpinner size="small" />
          ) : (
            <div className="balance">
              <span className="lighter">$</span>
              {localizedTotalMainCurrencyAmount}
            </div>
          )}
          {isSelected ? (
            <div className="connected_status">Connected</div>
          ) : null}
        </div>
        {!hideMenu && (
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
        )}
        {showOptionsMenu && (
          <ul ref={optionsMenuRef} className="options">
            <li>
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
      </div>

      <style jsx>{`
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          height: 52px;
        }
        .avatar {
          background: url("${avatarURL ?? "./images/avatar@2x.png"}") center
            no-repeat;
          background-color: var(--green-40);
          background-size: cover;
          width: 48px;
          height: 48px;
          border-radius: 12px;
        }
        .avatar_selected_outline {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          border: 2px solid #22c480;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-left: -4px;
          margin-right: -4px;
        }
        .left {
          display: flex;
          align-items: center;
        }
        .avatar {
          width: 48px;
          height: 48px;
        }
        .address_name {
          color: #fff;
          font-size: 18px;
          font-weight: 600;
        }
        .address {
          color: var(--green-40);
          font-size: 16px;
        }
        .balance {
          text-align: right;
          color: #fff;
          font-size: 16px;
        }
        .connected_status {
          color: #22c480;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          text-align: right;
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
        .info {
          margin-left: 16px;
        }
        .lighter {
          color: var(--green-40);
        }
        .icon_settings {
          background: url("./images/more_dots@2x.png") center no-repeat;
          background-size: cover;
          width: 4px;
          height: 20px;
          margin-left: 16px;
          border: 10px solid transparent;
        }
        .right {
          display: flex;
          align-items: center;
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
        .remove_address_option {
          margin-left: 20px;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 95%;
        }
        .remove_address_details {
          display: flex;
          flex-direction: column;
          line-height: 24px;
          font-size 16px;
        }
        .button_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .account_container {
          margin-top: -10px;
          background-color: var(--hunter-green);
          padding: 5px;
          border-radius: 16px;
        }
      `}</style>
    </li>
  )
}

SharedPanelAccountItem.defaultProps = {
  isSelected: false,
  hideMenu: false,
}
