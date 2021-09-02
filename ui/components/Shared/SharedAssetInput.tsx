import React, { ReactElement, useState } from "react"
import SharedButton from "./SharedButton"
import SharedSlideUpMenu from "./SharedSlideUpMenu"
import SharedAssetItem from "./SharedAssetItem"
import SharedAssetIcon from "./SharedAssetIcon"

interface SelectTokenMenuContentProps {
  setSelectedTokenAndClose: (token: any) => void
}

function SelectTokenMenuContent(
  props: SelectTokenMenuContentProps
): ReactElement {
  const { setSelectedTokenAndClose } = props

  return (
    <>
      <div className="standard_width_padded center_horizontal">
        <div className="search_label">Select token</div>
        <div className="search_wrap">
          <input
            type="text"
            className="search_input"
            placeholder="Search by name or address"
          />
          <span className="icon_search" />
        </div>
      </div>
      <div className="divider" />
      <ul>
        {Array(13)
          .fill("")
          .map(() => (
            <SharedAssetItem onClick={setSelectedTokenAndClose} />
          ))}
      </ul>
      <style jsx>
        {`
          .search_label {
            height: 20px;
            color: var(--green-60);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            margin-bottom: 16px;
            margin-top: -5px;
          }
          .search_wrap {
            display: flex;
          }
          .search_input {
            width: 336px;
            height: 48px;
            border-radius: 4px;
            border: 1px solid var(--green-60);
            padding-left: 16px;
            box-sizing: border-box;
            color: var(--green-40);
          }
          .search_input::placeholder {
            color: var(--green-40);
          }
          .icon_search {
            background: url("./images/search_large@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            position: absolute;
            right: 42px;
            margin-top: 11px;
          }
          .divider {
            width: 384px;
            border-bottom: 1px solid var(--hunter-green);
            margin-top: 15px;
            margin-bottom: 8.5px;
          }
        `}
      </style>
    </>
  )
}

interface SharedAssetInputProps {
  isTypeDestination?: boolean
  onClick?: () => void
}

export default function SharedAssetInput(
  props: SharedAssetInputProps
): ReactElement {
  const { isTypeDestination, onClick } = props

  const [openAssetMenu, setOpenAssetMenu] = useState(false)
  const [selectedToken, setSelectedToken] = useState({ name: false })

  function handleClick() {
    setOpenAssetMenu(!openAssetMenu)
    onClick()
  }

  function setSelectedTokenAndClose(token) {
    setSelectedToken(token)
    setOpenAssetMenu(false)
  }

  return (
    <>
      <SharedSlideUpMenu isOpen={openAssetMenu} close={handleClick}>
        {SelectTokenMenuContent({ setSelectedTokenAndClose })}
      </SharedSlideUpMenu>
      <div className="asset_input standard_width">
        {isTypeDestination ? (
          <>
            <input className="token_input" type="text" value="0x..." />
            <SharedButton
              type="tertiary"
              size="medium"
              label="Paste"
              icon="paste"
              iconSize="large"
            />
          </>
        ) : (
          <>
            {!selectedToken.name ? (
              <SharedButton
                type="secondary"
                size="medium"
                label="Select token"
                icon="chevron"
                onClick={handleClick}
              />
            ) : (
              <div className="token_group">
                <div className="asset_icon_wrap">
                  <SharedAssetIcon />
                </div>
                <SharedButton
                  type="tertiaryWhite"
                  size="medium"
                  label="ETH"
                  icon="chevron"
                  onClick={handleClick}
                />
              </div>
            )}
            <input className="input_amount" type="text" placeholder="0.0" />
          </>
        )}
      </div>
      <style jsx>
        {`
          .asset_input {
            height: 72px;
            border-radius: 4px;
            background-color: var(--green-95);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0px 16px;
            box-sizing: border-box;
          }
          .token_input {
            width: 204px;
            height: 34px;
            color: var(--green-40);
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
          }
          .paste_button {
            height: 24px;
            color: var(--trophy-gold);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            text-align: center;
            display: flex;
          }
          .icon_paste {
            background: url("./images/paste@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-left: 8px;
          }
          .input_amount {
            width: 98px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: right;
          }
          .input_amount::placeholder {
            color: #ffffff;
          }
          .token_group {
            display: flex;
            align-items: center;
          }
          .asset_icon_wrap {
            margin-right: 8px;
          }
        `}
      </style>
    </>
  )
}

SharedAssetInput.defaultProps = {
  isTypeDestination: false,
  onClick: () => {
    // do nothing by default
    // TODO replace this with support for undefined onClick
  },
}
