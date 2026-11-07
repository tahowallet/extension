import React, { ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { AddressBookEntry } from "@tallyho/tally-background/redux-slices/address-book"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  selectAccountTotals,
  selectAddressBookEntriesForNetwork,
  selectCurrentAccount,
} from "@tallyho/tally-background/redux-slices/selectors"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useBackgroundSelector, useListKeyboardNavigation } from "../../hooks"
import SharedSearchableList from "../Shared/SharedSearchableList"
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
  /**
   * For an account not in the address book, the name it already goes by: its
   * own name or its ENS name. Used to prefill the form when editing it.
   */
  existingName?: string
  /** The address book entry the name comes from, if any. */
  savedEntry?: AddressBookEntry
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
  const [editing, setEditing] = useState<SelectableAddress | undefined>()

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
        existingName: account.name,
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

  const { highlightedIndex, setHighlightedIndex, handleKeyDown } =
    useListKeyboardNavigation(filteredAddresses, onSelect, searchTerm)

  return (
    <>
      <SharedSearchableList
        title={t("selectAddress")}
        searchPlaceholder={t("searchAddresses")}
        onSearchChange={setSearchTerm}
        onSearchKeyDown={handleKeyDown}
      >
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
                isHighlighted={index === highlightedIndex}
                onMouseMove={() => setHighlightedIndex(index)}
                onSelect={() => onSelect(selectable)}
                onEdit={() => setEditing(selectable)}
              />
            ))}
          </ul>
        )}
      </SharedSearchableList>
      <SharedSlideUpMenu
        isOpen={editing !== undefined}
        size="auto"
        close={() => setEditing(undefined)}
      >
        {editing !== undefined && (
          <AddressBookEntryForm
            // Edit an entry where it's saved, so the name keeps applying where
            // it already does.
            entry={editing.savedEntry}
            initialName={editing.existingName}
            address={editing.address}
            network={network}
            onSaved={() => setEditing(undefined)}
            onRemoved={() => setEditing(undefined)}
          />
        )}
      </SharedSlideUpMenu>
      <style jsx>{`
        .address_list {
          display: block;
          margin: 0;
          padding: 0;
        }
        .empty {
          margin: 8px 0;
          color: var(--green-40);
          font-size: 14px;
          line-height: 20px;
          text-align: center;
        }
      `}</style>
    </>
  )
}
