import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { AnyAsset, Asset } from "@tallyho/tally-background/assets"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import SharedButton from "./SharedButton"
import SharedSlideUpMenu from "./SharedSlideUpMenu"
import SharedAssetItem from "./SharedAssetItem"
import SharedAssetIcon from "./SharedAssetIcon"

interface SelectAssetMenuContentProps<T extends AnyAsset> {
  assets: T[]
  setSelectedAssetAndClose: (asset: T) => void
}

function SelectAssetMenuContent<T extends AnyAsset>(
  props: SelectAssetMenuContentProps<T>
): ReactElement {
  const { setSelectedAssetAndClose, assets } = props
  const [searchTerm, setSearchTerm] = useState("")
  const searchInput = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    searchInput.current?.focus()
  }, [searchInput])

  return (
    <>
      <div className="standard_width_padded center_horizontal">
        <div className="search_label">Select token</div>
        <div className="search_wrap">
          <input
            type="text"
            ref={searchInput}
            className="search_input"
            placeholder="Search by name or address"
            spellCheck={false}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <span className="icon_search" />
        </div>
      </div>
      <div className="divider" />
      <ul>
        {assets
          .filter((asset) => {
            return (
              asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
              ("contractAddress" in asset &&
                searchTerm.startsWith("0x") &&
                normalizeEVMAddress(asset.contractAddress).includes(
                  // The replace handles `normalizeEVMAddress`'s
                  // octet alignment that prefixes a `0` to a partial address
                  // if it has an uneven number of digits.
                  normalizeEVMAddress(searchTerm).replace(/^0x0?/, "0x")
                ) &&
                asset.contractAddress.length >= searchTerm.length)
            )
          })
          .map((asset) => {
            return (
              <SharedAssetItem
                key={asset.metadata?.coinGeckoID || asset.symbol}
                asset={asset}
                onClick={setSelectedAssetAndClose}
              />
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

interface SelectedAssetButtonProps {
  asset: Asset
  isDisabled: boolean
  toggleIsAssetMenuOpen?: () => void
}

function SelectedAssetButton(props: SelectedAssetButtonProps): ReactElement {
  const { asset, isDisabled, toggleIsAssetMenuOpen } = props

  return (
    <button type="button" disabled={isDisabled} onClick={toggleIsAssetMenuOpen}>
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
        button:disabled {
          cursor: default;
          color: var(--green-40);
        }
        .asset_icon_wrap {
          margin-right: 8px;
        }
      `}</style>
    </button>
  )
}

SelectedAssetButton.defaultProps = {
  toggleIsAssetMenuOpen: null,
}

interface SharedAssetInputProps<T extends AnyAsset> {
  isTypeDestination: boolean
  assets: T[]
  label: string
  defaultAsset: T
  amount: string
  maxBalance: number | boolean
  isAssetOptionsLocked: boolean
  disableDropdown: boolean
  isDisabled?: boolean
  onAssetSelect: (asset: T) => void
  onAmountChange: (value: string, errorMessage: string | undefined) => void
  onSendToAddressChange: (value: string) => void
}

export default function SharedAssetInput<T extends AnyAsset>(
  props: SharedAssetInputProps<T>
): ReactElement {
  const {
    isTypeDestination,
    assets,
    label,
    defaultAsset,
    amount,
    maxBalance,
    isAssetOptionsLocked,
    disableDropdown,
    isDisabled,
    onAssetSelect,
    onAmountChange,
    onSendToAddressChange,
  } = props

  const [openAssetMenu, setOpenAssetMenu] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(defaultAsset)

  // TODO: Refactor this to track state in a more reasonable way
  useEffect(() => {
    setSelectedAsset(defaultAsset)
  }, [defaultAsset])

  const toggleIsAssetMenuOpen = useCallback(() => {
    if (!isAssetOptionsLocked) {
      setOpenAssetMenu((currentlyOpen) => !currentlyOpen)
    }
  }, [isAssetOptionsLocked])

  const setSelectedAssetAndClose = useCallback(
    (asset: T) => {
      setSelectedAsset(asset)
      setOpenAssetMenu(false)
      onAssetSelect?.(asset)
    },

    [onAssetSelect]
  )

  const getErrorMessage = (givenAmount: string): string | undefined => {
    return (!isTypeDestination && maxBalance >= Number(givenAmount)) ||
      Number(givenAmount) === 0 ||
      !maxBalance
      ? undefined
      : "Insufficient balance"
  }

  return (
    <label className="label">
      {label}
      <SharedSlideUpMenu
        isOpen={openAssetMenu}
        close={() => {
          setOpenAssetMenu(false)
        }}
      >
        {assets && (
          <SelectAssetMenuContent
            assets={assets}
            setSelectedAssetAndClose={setSelectedAssetAndClose}
          />
        )}
      </SharedSlideUpMenu>
      <div className="asset_wrap standard_width">
        {isTypeDestination ? (
          <>
            <input
              className="asset_input"
              type="text"
              placeholder="0x..."
              spellCheck={false}
              onChange={(event) => {
                onSendToAddressChange(event.target.value)
              }}
            />
          </>
        ) : (
          <>
            <div>
              {selectedAsset?.symbol ? (
                <SelectedAssetButton
                  isDisabled={isDisabled || disableDropdown}
                  asset={selectedAsset}
                  toggleIsAssetMenuOpen={toggleIsAssetMenuOpen}
                />
              ) : (
                <SharedButton
                  type="secondary"
                  size="medium"
                  isDisabled={isDisabled || disableDropdown}
                  onClick={toggleIsAssetMenuOpen}
                  icon="chevron"
                >
                  Select token
                </SharedButton>
              )}
            </div>

            <input
              className="input_amount"
              type="number"
              step="any"
              placeholder="0.0"
              min="0"
              disabled={isDisabled}
              value={amount}
              spellCheck={false}
              onChange={(event) =>
                onAmountChange(
                  event.target.value,
                  getErrorMessage(event.target.value)
                )
              }
            />
          </>
        )}
        <div className="error_message">{getErrorMessage(amount)}</div>
      </div>
      <style jsx>
        {`
          .asset_wrap {
            height: 72px;
            border-radius: 4px;
            background-color: var(--green-95);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0px 16px;
            box-sizing: border-box;
          }
          .asset_input {
            width: 100%;
            height: 34px;
            font-size: 28px;
            font-weight: 500;
            line-height: 32px;
            color: #fff;
          }
          .asset_input::placeholder {
            color: var(--green-40);
            opacity: 1;
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
          .input_amount::placeholder {
            color: var(--green-40);
            opacity: 1;
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
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
          .input_amount:disabled {
            cursor: default;
            color: var(--green-40);
          }
          .error_message {
            color: var(--error);
            position: absolute;
            font-weight: 500;
            font-size: 14px;
            line-height: 20px;
            transform: translateY(-3px);
            align-self: flex-end;
            text-align: end;
            width: 150px;
            background-color: var(--green-95);
            margin-left: 172px;
            z-index: 1;
          }
        `}
      </style>
    </label>
  )
}

SharedAssetInput.defaultProps = {
  isTypeDestination: false,
  isAssetOptionsLocked: false,
  disableDropdown: false,
  isDisabled: false,
  assets: [{ symbol: "ETH", name: "Example Asset" }],
  defaultAsset: { symbol: "", name: "" },
  label: "",
  amount: "0.0",
  maxBalance: false,
  onAssetSelect: () => {
    // do nothing by default
    // TODO replace this with support for undefined onClick
  },
  onAmountChange: () => {},
  onSendToAddressChange: () => {},
}
