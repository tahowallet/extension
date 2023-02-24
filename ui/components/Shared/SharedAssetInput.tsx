import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { AnyAsset, Asset } from "@tallyho/tally-background/assets"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import {
  convertFixedPointNumber,
  fixedPointNumberToString,
  parseToFixedPointNumber,
} from "@tallyho/tally-background/lib/fixed-point"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  NFTCached,
  NFTCollectionCached,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import classNames from "classnames"
import { isUntrustedAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import SharedButton from "./SharedButton"
import SharedSlideUpMenu from "./SharedSlideUpMenu"
import SharedAssetItem, {
  AnyAssetWithOptionalAmount,
  hasAmounts,
} from "./SharedAssetItem"
import SharedAssetIcon from "./SharedAssetIcon"
import PriceDetails from "./PriceDetails"
import SharedPanelSwitcher from "./SharedPanelSwitcher"
import noop from "../../utils/noop"
import NFTCollectionAccordion from "../Send/NFTCollectionAccordion"

// List of symbols we want to display first.  Lower array index === higher priority.
// For now we just prioritize somewhat popular assets that we are able to load an icon for.
const SYMBOL_PRIORITY_LIST = [
  "MATIC",
  "KEEP",
  "ENS",
  "CRV",
  "FTM",
  "GRT",
  "BAL",
  "NU",
  "AMP",
  "BNT",
  "COMP",
  "UMA",
  "WLTC",
  "CVC",
]

const symbolPriority = Object.fromEntries(
  SYMBOL_PRIORITY_LIST.map((symbol, idx) => [
    symbol,
    SYMBOL_PRIORITY_LIST.length - idx,
  ])
)
interface SelectAssetMenuContentProps<AssetType extends AnyAsset> {
  currentNetwork: EVMNetwork
  assets: AnyAssetWithOptionalAmount<AssetType>[]
  nfts: NFTCollectionCached[]
  setSelectedAssetAndClose: (
    asset: AnyAssetWithOptionalAmount<AssetType>
  ) => void
  onSelectNFT?: (nft: NFTCached) => void
}

// Sorts an AnyAssetWithOptionalAmount by symbol, alphabetically, according to
// the current locale.  Symbols passed into the symbolList will take priority
// over alphabetical sorting.
function prioritizedAssetAlphabeticSorter<
  AssetType extends AnyAsset,
  T extends AnyAssetWithOptionalAmount<AssetType>
>({ asset: { symbol: symbol1 } }: T, { asset: { symbol: symbol2 } }: T) {
  const firstSymbolPriority = symbolPriority[symbol1] ?? 0
  const secondSymbolPriority = symbolPriority[symbol2] ?? 0
  if (firstSymbolPriority > secondSymbolPriority) {
    return -1
  }
  if (firstSymbolPriority < secondSymbolPriority) {
    return 1
  }

  return symbol1.localeCompare(symbol2)
}

// Sorts an AnyAssetWithOptionalAmount by symbol, alphabetically, according to
// the current locale, but bubbles to the top any assets that match the passed
// `searchTerm` at the start of the symbol. Matches are case-insensitive for
// sorting purposes.
//
// For example, if a set of assets [DAAD, AD, AB, AC, AA] is passed, and the
// search term is empty, the list will be [DAAD, AA, AB, AC, AD]. If the search
// term is instead AA, the list will be [AA, DAAD, AB, AC, AD]. Note that this
// function performs no filtering against the search term, the search term is
// purely used to sort start-anchored symbol matches in front of all other
// assets.
function assetAlphabeticSorterWithFilter<
  AssetType extends AnyAsset,
  T extends AnyAssetWithOptionalAmount<AssetType>
>(searchTerm: string): (asset1: T, asset2: T) => number {
  const startingSearchTermRegExp = new RegExp(`^${searchTerm}.*$`, "i")

  return (
    { asset: { symbol: symbol1 } }: T,
    { asset: { symbol: symbol2 } }: T
  ) => {
    const searchTermStartMatch1 = startingSearchTermRegExp.test(symbol1)
    const searchTermStartMatch2 = startingSearchTermRegExp.test(symbol2)

    // If either search term matches at the start and the other doesn't, the
    // one that matches at the start is greater.
    if (searchTermStartMatch1 && !searchTermStartMatch2) {
      return -1
    }
    if (!searchTermStartMatch1 && searchTermStartMatch2) {
      return 1
    }

    return symbol1.localeCompare(symbol2)
  }
}

function SelectAssetMenuContent<T extends AnyAsset>(
  props: SelectAssetMenuContentProps<T>
): ReactElement {
  const { t } = useTranslation()
  const {
    setSelectedAssetAndClose,
    assets,
    currentNetwork,
    nfts: nftCollections,
    onSelectNFT = noop,
  } = props
  const [searchTerm, setSearchTerm] = useState("")
  const searchInput = useRef<HTMLInputElement | null>(null)

  const trustedAssets = assets.filter(
    ({ asset }) => !isUntrustedAsset(asset, currentNetwork)
  )

  const filteredAssets =
    searchTerm.trim() === ""
      ? trustedAssets
      : trustedAssets.filter(({ asset }) => {
          return (
            asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ("contractAddress" in asset &&
              asset.contractAddress &&
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

  const sortedFilteredAssets = filteredAssets.sort(
    searchTerm.trim() === ""
      ? prioritizedAssetAlphabeticSorter
      : assetAlphabeticSorterWithFilter(searchTerm.trim())
  )

  useEffect(() => {
    searchInput.current?.focus()
  }, [searchInput])

  const shouldDisplayNFTs = nftCollections.length > 0
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <>
      {shouldDisplayNFTs && (
        <div className="panel_switcher">
          <SharedPanelSwitcher
            setPanelNumber={setPanelNumber}
            panelNumber={panelNumber}
            panelNames={["Tokens", "NFTs"]}
          />
        </div>
      )}
      {panelNumber === 0 && (
        <div className={classNames(shouldDisplayNFTs && "nfts_update")}>
          <div className="standard_width_padded center_horizontal">
            <div className="search_label">{t("shared.selectToken")}</div>
            <div className="search_wrap">
              <input
                type="text"
                ref={searchInput}
                className="search_input"
                placeholder={t("assetInput.search")}
                spellCheck={false}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <span className="icon_search" />
            </div>
          </div>
          <div className="divider" />
          <ul className="assets_list">
            {sortedFilteredAssets.map((assetWithOptionalAmount) => {
              const { asset } = assetWithOptionalAmount
              return (
                <SharedAssetItem
                  key={
                    asset.metadata?.coinGeckoID ??
                    asset.symbol +
                      ("contractAddress" in asset ? asset.contractAddress : "")
                  }
                  assetAndAmount={assetWithOptionalAmount}
                  onClick={() =>
                    setSelectedAssetAndClose(assetWithOptionalAmount)
                  }
                  currentNetwork={currentNetwork}
                />
              )
            })}
          </ul>
        </div>
      )}
      {panelNumber === 1 && (
        <div className="nfts_update standard_width_padded center_horizontal">
          <div className="search_wrap">
            <input
              type="text"
              ref={searchInput}
              className="search_input"
              placeholder={t("assetInput.searchNFT")}
              spellCheck={false}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <span className="icon_search" />
          </div>
          <div className="nft_list">
            {nftCollections.map((collection) => (
              <NFTCollectionAccordion
                key={collection.id}
                collection={collection}
                onSelectNFT={onSelectNFT}
              />
            ))}
          </div>
        </div>
      )}
      <style jsx>
        {`
          .panel_switcher {
            width: 100%;
          }
          .nfts_update > div {
            margin-top: 16px;
          }

          .nft_list {
            display: flex;
            flex-direction: column;
            gap: 20px;
            overflow: scroll;
            height: calc(100% - 96px);
            width: 100%;
          }

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
            padding-right: 56px;
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
            height: 0;
            border-bottom: 1px solid var(--hunter-green);
            margin-top: 15px;
          }
          .assets_list {
            display: block;
            overflow: scroll;
            height: calc(100% - 96px);
            width: 100%;
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
  selectedNFT?: NFTCached
}

function SelectedAssetButton(props: SelectedAssetButtonProps): ReactElement {
  const { asset, isDisabled, toggleIsAssetMenuOpen, selectedNFT } = props

  if (selectedNFT) {
    const { name, thumbnailURL } = selectedNFT
    return (
      <button
        type="button"
        disabled={isDisabled}
        onClick={toggleIsAssetMenuOpen}
      >
        <img
          width="56"
          height="56"
          src={thumbnailURL}
          loading="lazy"
          alt={name}
        />
        <span className="ellipsis">{name}</span>
        <style jsx>{`
          button {
            display: flex;
            gap: 8px;
            align-items: center;
            max-width: calc(100% - 32px);
          }
          img {
            border-radius: 4px;
            object-fit: cover;
            object-position: center;
          }
          span {
            font-family: "Segment";
            font-style: normal;
            font-weight: 500;
            font-size: 16px;
            line-height: 24px;
            color: var(--white);
          }
        `}</style>
      </button>
    )
  }

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

interface SharedAssetInputProps<AssetType extends AnyAsset> {
  currentNetwork: EVMNetwork
  assetsAndAmounts: AnyAssetWithOptionalAmount<AssetType>[]
  label: string
  selectedAsset: AssetType | undefined
  amount: string
  amountMainCurrency?: string
  priceImpact?: number
  isAssetOptionsLocked: boolean
  disableDropdown: boolean
  showMaxButton: boolean
  isDisabled?: boolean
  isPriceDetailsLoading?: boolean
  showPriceDetails?: boolean
  mainCurrencySign?: string
  onAssetSelect?: (asset: AssetType) => void
  onFocus?: () => void
  onBlur?: () => void
  onAmountChange?: (value: string, errorMessage: string | undefined) => void
  NFTCollections?: NFTCollectionCached[]
  onSelectNFT?: (nft: NFTCached) => void
  selectedNFT?: NFTCached
}

function isSameAsset(asset1: Asset, asset2: Asset) {
  return asset1.symbol === asset2.symbol // FIXME Once asset similarity logic is extracted, reuse.
}

function assetWithOptionalAmountFromAsset<T extends AnyAsset>(
  asset: T,
  assetsToSearch: AnyAssetWithOptionalAmount<T>[]
): AnyAssetWithOptionalAmount<T> {
  return (
    assetsToSearch.find(({ asset: listAsset }) =>
      isSameAsset(asset, listAsset)
    ) ?? {
      // If not found, default balance to zero
      asset: { ...asset, decimals: 1 },
      localizedDecimalAmount: "0",
      amount: BigInt(0),
    }
  )
}

export default function SharedAssetInput<T extends AnyAsset>(
  props: SharedAssetInputProps<T>
): ReactElement {
  const { t } = useTranslation()
  const {
    currentNetwork,
    assetsAndAmounts,
    label,
    selectedAsset,
    amount,
    amountMainCurrency,
    priceImpact,
    isAssetOptionsLocked,
    disableDropdown,
    showMaxButton,
    isDisabled,
    showPriceDetails,
    isPriceDetailsLoading,
    mainCurrencySign,
    onAssetSelect,
    onAmountChange,
    onFocus = () => {},
    onBlur = () => {},
    NFTCollections,
    onSelectNFT,
    selectedNFT,
  } = props
  const [openAssetMenu, setOpenAssetMenu] = useState(false)

  // TODO: use https://reactjs.org/docs/hooks-reference.html#useid once we update to version 18
  const [inputId] = useState(Math.floor(Math.random() * 100))

  const toggleIsAssetMenuOpen = useCallback(() => {
    if (!isAssetOptionsLocked) {
      setOpenAssetMenu((currentlyOpen) => !currentlyOpen)
    }
  }, [isAssetOptionsLocked])

  const selectedAssetAndAmount =
    typeof selectedAsset !== "undefined"
      ? assetWithOptionalAmountFromAsset<T>(selectedAsset, assetsAndAmounts)
      : undefined

  const setSelectedAssetAndClose = useCallback(
    (assetWithOptionalAmount: AnyAssetWithOptionalAmount<T>) => {
      setOpenAssetMenu(false)
      onAssetSelect?.(assetWithOptionalAmount.asset)
    },

    [onAssetSelect]
  )

  const isMaxButtonVisible =
    showMaxButton &&
    selectedAssetAndAmount?.asset.symbol !== currentNetwork.baseAsset.symbol

  const [errorMessage, setErrorMessage] = useState("")

  const getErrorMessage = useCallback(
    (givenAmount: string): string | undefined => {
      if (
        givenAmount.trim() === "" ||
        typeof selectedAssetAndAmount === "undefined" ||
        !hasAmounts(selectedAssetAndAmount) ||
        !("decimals" in selectedAssetAndAmount.asset)
      ) {
        return undefined
      }

      const parsedGivenAmount = parseToFixedPointNumber(givenAmount.trim())
      if (typeof parsedGivenAmount === "undefined") {
        return t("assetInput.error.invalidAmount")
      }

      const decimalMatched = convertFixedPointNumber(
        parsedGivenAmount,
        selectedAssetAndAmount.asset.decimals
      )
      if (
        decimalMatched.amount > selectedAssetAndAmount.amount ||
        selectedAssetAndAmount.amount <= 0
      ) {
        return t("assetInput.error.insufficientBalance")
      }

      return undefined
    },
    [selectedAssetAndAmount, t]
  )

  const handleSelectNFT = (nft: NFTCached) => {
    setOpenAssetMenu(false)
    onSelectNFT?.(nft)
  }

  useEffect(() => {
    const error = getErrorMessage(amount)
    setErrorMessage(error ?? "")
  }, [amount, getErrorMessage])

  const setMaxBalance = () => {
    if (
      typeof selectedAssetAndAmount === "undefined" ||
      !hasAmounts(selectedAssetAndAmount)
    ) {
      return
    }

    const fixedPointAmount = {
      amount: selectedAssetAndAmount.amount,
      decimals:
        "decimals" in selectedAssetAndAmount.asset
          ? selectedAssetAndAmount.asset.decimals
          : 0,
    }
    const fixedPointString = fixedPointNumberToString(fixedPointAmount)

    onAmountChange?.(fixedPointString, getErrorMessage(fixedPointString))
  }

  const displayedBalance = selectedNFT
    ? 1
    : selectedAssetAndAmount &&
      hasAmounts(selectedAssetAndAmount) &&
      selectedAssetAndAmount.localizedDecimalAmount
  return (
    <>
      <label
        className="label"
        htmlFor={
          typeof selectedAsset === "undefined"
            ? `asset_selector${inputId}`
            : `asset_amount_input${inputId}`
        }
      >
        {label}
      </label>

      {displayedBalance ? (
        <div className="amount_controls">
          <span className="available">
            {t("send.balance", {
              amount: displayedBalance,
            })}
          </span>
          {isMaxButtonVisible ? (
            <button type="button" className="max" onClick={setMaxBalance}>
              Max
            </button>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <></>
      )}

      <SharedSlideUpMenu
        isOpen={openAssetMenu}
        close={() => {
          setOpenAssetMenu(false)
        }}
      >
        {assetsAndAmounts && (
          <SelectAssetMenuContent
            currentNetwork={currentNetwork}
            assets={assetsAndAmounts}
            setSelectedAssetAndClose={setSelectedAssetAndClose}
            onSelectNFT={handleSelectNFT}
            nfts={NFTCollections ?? []}
          />
        )}
      </SharedSlideUpMenu>
      <div
        className="asset_wrap standard_width"
        data-type={selectedNFT ? "nft" : "token"}
      >
        <div>
          {selectedAssetAndAmount?.asset.symbol ? (
            <SelectedAssetButton
              isDisabled={isDisabled || disableDropdown}
              asset={selectedAssetAndAmount.asset}
              selectedNFT={selectedNFT}
              toggleIsAssetMenuOpen={toggleIsAssetMenuOpen}
            />
          ) : (
            <SharedButton
              id={`asset_selector${inputId}`}
              type="secondary"
              size="medium"
              isDisabled={isDisabled || disableDropdown}
              onClick={toggleIsAssetMenuOpen}
              iconSmall="dropdown"
            >
              {t("assetInput.selectToken")}
            </SharedButton>
          )}
        </div>
        {!selectedNFT && (
          <div className="input_amount_wrap">
            <input
              id={`asset_amount_input${inputId}`}
              className="input_amount"
              type="number"
              step="any"
              placeholder="0.0"
              min="0"
              disabled={isDisabled}
              value={amount}
              spellCheck={false}
              onFocus={(e) => {
                if (e.target === e.currentTarget) {
                  onFocus()
                }
              }}
              onBlur={(e) => {
                if (e.target === e.currentTarget) {
                  onBlur()
                }
              }}
              onChange={(event) =>
                onAmountChange?.(
                  event.target.value,
                  getErrorMessage(event.target.value)
                )
              }
            />
            {showPriceDetails &&
              amount &&
              selectedAsset &&
              Number(amount) !== 0 &&
              (!errorMessage ? (
                <PriceDetails
                  amountMainCurrency={amountMainCurrency}
                  priceImpact={priceImpact}
                  isLoading={!!isPriceDetailsLoading}
                  mainCurrencySign={mainCurrencySign || ""}
                />
              ) : (
                <div className="error_message">{errorMessage}</div>
              ))}
          </div>
        )}
        {errorMessage && !showPriceDetails && (
          <div className="error_message error_message_wrap">{errorMessage}</div>
        )}
      </div>
      <style jsx>
        {`
          label,
          .amount_controls {
            font-weight: 500;
          }
          .amount_controls {
            line-height: 27px;
            // align with label top + offset by border radius right
            margin: -27px 4px 0 0;

            color: var(--green-40);
            text-align: right;
            position: relative;
            font-size: 14px;
          }
          .max {
            margin-left: 8px; // space to balance
            color: var(--trophy-gold);
            cursor: pointer;
          }
          .asset_wrap {
            height: 72px;
            border-radius: 4px;
            background-color: var(--green-95);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            padding: 0px 16px;
            box-sizing: border-box;
            position: relative;
          }
          .asset_wrap[data-type="nft"] {
            padding: 8px;
          }
          .asset_wrap[data-type="nft"] > div {
            flex-grow: 1;
            max-width: 100%;
          }
          // Using :global() to target child component
          label:hover ~ .asset_wrap > div > :global(button:hover) {
            background: unset;
            color: var(--trophy-gold);
          }
          label:hover ~ .asset_wrap > div > :global(button:hover .icon_button) {
            background-color: var(--trophy-gold);
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
          .input_amount_wrap {
            display: flex;
            flex-direction: column;
          }
          .input_amount::placeholder {
            color: var(--green-40);
            opacity: 1;
          }
          .input_amount {
            max-width: 125px;
            height: 32px;
            color: #ffffff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: right;
            text-overflow: ellipsis;
            transition: color 100ms ease-in;
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
            font-weight: 500;
            font-size: 14px;
            line-height: 24px;
          }
          .error_message_wrap {
            position: absolute;
            width: 150px;
            margin-left: 172px;
            transform: translateY(-3px);
            align-self: flex-end;
            text-align: end;
          }
        `}
      </style>
    </>
  )
}

SharedAssetInput.defaultProps = {
  isAssetOptionsLocked: false,
  disableDropdown: false,
  isDisabled: false,
  showMaxButton: true,
  assetsAndAmounts: [],
  label: "",
  amount: "0.0",
}
