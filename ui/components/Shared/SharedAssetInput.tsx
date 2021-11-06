import React, { ReactElement, useCallback, useState } from "react"
import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import { Asset } from "@tallyho/tally-background/types"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "./SharedButton"
import SharedSlideUpMenu from "./SharedSlideUpMenu"
import SharedAssetItem from "./SharedAssetItem"
import SharedAssetIcon from "./SharedAssetIcon"

interface SelectTokenMenuContentProps {
  setSelectedTokenAndClose: (token: Asset) => void
}

function SelectTokenMenuContent(
  props: SelectTokenMenuContentProps
): ReactElement {
  const { setSelectedTokenAndClose } = props

  const { combinedData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  const displayAssets = combinedData.assets.filter(
    ({ asset, amount }) => amount > 0
  )

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
        {displayAssets.map(({ asset }) => {
          return (
            <SharedAssetItem asset={asset} onClick={setSelectedTokenAndClose} />
          )
        })}
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

interface SelectedTokenButtonProps {
  asset: Asset
  toggleIsTokenMenuOpen?: () => void
}

function SelectedTokenButton(props: SelectedTokenButtonProps): ReactElement {
  const { asset, toggleIsTokenMenuOpen } = props

  return (
    <button type="button" onClick={toggleIsTokenMenuOpen}>
      <div className="asset_icon_wrap">
        <SharedAssetIcon
          logoURL={asset?.metadata?.logoURL}
          symbol={asset?.symbol}
        />
      </div>

      {asset?.symbol}

      <style jsx>{`
        button {
          display: flex;
          align-items: center;
          color: #fff;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          text-transform: uppercase;
        }
        .asset_icon_wrap {
          margin-right: 8px;
        }
      `}</style>
    </button>
  )
}

SelectedTokenButton.defaultProps = {
  toggleIsTokenMenuOpen: null,
}

interface SharedAssetInputProps {
  isTypeDestination: boolean
  onAssetSelected?: (token: Asset) => void
  label: string
  defaultToken: Asset
  isTokenOptionsLocked: boolean
}

export default function SharedAssetInput(
  props: SharedAssetInputProps
): ReactElement {
  const {
    isTypeDestination,
    label,
    defaultToken,
    isTokenOptionsLocked,
    onAssetSelected,
  } = props

  const [openAssetMenu, setOpenAssetMenu] = useState(false)
  const [selectedToken, setSelectedToken] = useState(defaultToken)

  const toggleIsTokenMenuOpen = useCallback(() => {
    if (!isTokenOptionsLocked) {
      setOpenAssetMenu((currentlyOpen) => !currentlyOpen)
    }
  }, [isTokenOptionsLocked])

  const setSelectedTokenAndClose = useCallback(
    (token) => {
      setSelectedToken(token)
      setOpenAssetMenu(false)
      onAssetSelected?.(token)
    },

    [onAssetSelected]
  )

  return (
    <label className="label">
      {label}
      <SharedSlideUpMenu
        isOpen={openAssetMenu}
        close={() => {
          setOpenAssetMenu(false)
        }}
      >
        <SelectTokenMenuContent
          setSelectedTokenAndClose={setSelectedTokenAndClose}
        />
      </SharedSlideUpMenu>
      <div className="asset_input standard_width">
        {isTypeDestination ? (
          <>
            <input className="token_input" type="text" value="0x..." />
            <SharedButton
              type="tertiary"
              size="medium"
              icon="paste"
              iconSize="large"
            >
              Paste
            </SharedButton>
          </>
        ) : (
          <>
            {selectedToken?.symbol ? (
              <SelectedTokenButton
                asset={selectedToken}
                toggleIsTokenMenuOpen={toggleIsTokenMenuOpen}
              />
            ) : (
              <SharedButton
                type="secondary"
                size="medium"
                onClick={toggleIsTokenMenuOpen}
                icon="chevron"
              >
                Select token
              </SharedButton>
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
        `}
      </style>
    </label>
  )
}

SharedAssetInput.defaultProps = {
  isTypeDestination: false,
  isTokenOptionsLocked: false,
  defaultToken: { symbol: "", name: "" },
  label: "",
}
