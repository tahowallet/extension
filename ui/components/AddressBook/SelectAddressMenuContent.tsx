import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import type { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  selectAccountTotals,
  selectAddressBookEntriesForNetwork,
  selectCurrentAccount,
} from "@tallyho/tally-background/redux-slices/selectors"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import AddressBookEntryForm from "./AddressBookEntryForm"
import AddressBookListItem from "./AddressBookListItem"

/**
 * A row in the list: a saved address, one of the user's own accounts, or both.
 * Contacts, contracts, and the user's accounts share one list, since any of
 * them can be named.
 */
export type SelectableAddress = {
  address: string
  name: string
  isOwnAccount: boolean
  isCurrentAccount: boolean
  /** The address book entry the name comes from, if any. */
  savedEntry?: AddressOnNetwork & { name: string }
}

type Props = {
  network: EVMNetwork
  onSelect: (selected: SelectableAddress) => void
}

export default function SelectAddressMenuContent({
  network,
  onSelect,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "addressBook" })

  const entries = useBackgroundSelector((state) =>
    selectAddressBookEntriesForNetwork(state, network),
  )
  const accountTotals = useBackgroundSelector(selectAccountTotals)
  const currentAccount = useBackgroundSelector(selectCurrentAccount)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [editing, setEditing] = useState<SelectableAddress | undefined>()
  const searchInput = useRef<HTMLInputElement | null>(null)

  const addresses = useMemo((): SelectableAddress[] => {
    const isOwnAccount = (address: string) =>
      accountTotals.some((account) => sameEVMAddress(account.address, address))

    const saved = entries.map((entry): SelectableAddress => ({
      address: entry.address,
      name: entry.name,
      isOwnAccount: isOwnAccount(entry.address),
      isCurrentAccount: sameEVMAddress(entry.address, currentAccount.address),
      savedEntry: entry,
    }))

    const unsavedAccounts = accountTotals
      .filter(
        (account) =>
          !entries.some((entry) =>
            sameEVMAddress(entry.address, account.address),
          ),
      )
      .map((account): SelectableAddress => ({
        address: account.address,
        name: account.name ?? account.shortenedAddress,
        isOwnAccount: true,
        isCurrentAccount: sameEVMAddress(
          account.address,
          currentAccount.address,
        ),
      }))

    return [...saved, ...unsavedAccounts].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [accountTotals, currentAccount.address, entries])

  const filteredAddresses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (term === "") {
      return addresses
    }
    return addresses.filter(
      ({ name, address }) =>
        name.toLowerCase().includes(term) ||
        address.toLowerCase().includes(term),
    )
  }, [addresses, searchTerm])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchTerm])

  useEffect(() => {
    searchInput.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const maxIndex = filteredAddresses.length - 1
      const moveDown = () =>
        setSelectedIndex((previous) => Math.min(previous + 1, maxIndex))
      const moveUp = () =>
        setSelectedIndex((previous) => Math.max(previous - 1, 0))

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          moveDown()
          break
        case "ArrowUp":
          event.preventDefault()
          moveUp()
          break
        case "n":
          if (event.ctrlKey) {
            event.preventDefault()
            moveDown()
          }
          break
        case "p":
          if (event.ctrlKey) {
            event.preventDefault()
            moveUp()
          }
          break
        case "Enter":
          event.preventDefault()
          if (filteredAddresses[selectedIndex]) {
            onSelect(filteredAddresses[selectedIndex])
          }
          break
        default:
          break
      }
    },
    [filteredAddresses, selectedIndex, onSelect],
  )

  return (
    <>
      <div className="standard_width_padded center_horizontal">
        <div className="search_label">{t("selectAddress")}</div>
        <div className="search_wrap">
          <input
            type="text"
            ref={searchInput}
            className="search_input"
            placeholder={t("searchAddresses")}
            spellCheck={false}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="icon_search" />
        </div>
      </div>
      <div className="divider" />
      {filteredAddresses.length === 0 ? (
        <p className="empty">
          {addresses.length === 0 ? t("empty") : t("noMatches")}
        </p>
      ) : (
        <ul className="address_list">
          {filteredAddresses.map((selectable, index) => (
            <AddressBookListItem
              key={selectable.address}
              name={selectable.name}
              address={selectable.address}
              isOwnAccount={selectable.isOwnAccount}
              isCurrentAccount={selectable.isCurrentAccount}
              isHighlighted={index === selectedIndex}
              onMouseMove={() => setSelectedIndex(index)}
              onSelect={() => onSelect(selectable)}
              onEdit={() => setEditing(selectable)}
            />
          ))}
        </ul>
      )}
      <SharedSlideUpMenu
        isOpen={editing !== undefined}
        size="custom"
        customSize="296px"
        close={() => setEditing(undefined)}
      >
        {editing !== undefined && (
          <AddressBookEntryForm
            // Edit an entry where it's saved, so the name keeps applying where
            // it already does.
            addressOnNetwork={
              editing.savedEntry ?? { address: editing.address, network }
            }
            savedName={editing.savedEntry?.name}
            onSaved={() => setEditing(undefined)}
            onRemoved={() => setEditing(undefined)}
          />
        )}
      </SharedSlideUpMenu>
      <style jsx>{`
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
          position: relative;
        }
        .search_input {
          width: 100%;
          height: 48px;
          border-radius: 4px;
          border: 1px solid var(--green-60);
          padding-left: 16px;
          padding-right: 56px;
          box-sizing: border-box;
          color: var(--green-40);
          background: transparent;
        }
        .search_input::placeholder {
          color: var(--green-40);
        }
        :global([data-theme="light"]) .icon_search {
          background: var(--green-40);
          mask: url("./images/search_large@2x.png") center / 24px 24px no-repeat;
        }
        .icon_search {
          background: url("./images/search_large@2x.png");
          background-size: 24px 24px;
          width: 24px;
          height: 24px;
          position: absolute;
          right: 16px;
          top: 12px;
        }
        .divider {
          width: 100%;
          height: 0;
          border-bottom: 1px solid var(--hunter-green);
          margin-top: 15px;
        }
        .address_list {
          display: block;
          overflow-y: auto;
          height: calc(100% - 120px);
          width: 100%;
          margin: 0;
          padding: 16px 24px;
          box-sizing: border-box;
        }
        .empty {
          margin: 24px;
          color: var(--green-40);
          font-size: 14px;
          line-height: 20px;
          text-align: center;
        }
      `}</style>
    </>
  )
}
