import React, { ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  selectAddressBookEntries,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import type { AddressBookEntry } from "@tallyho/tally-background/redux-slices/address-book"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import SharedSlideUpMenu from "../../components/Shared/SharedSlideUpMenu"
import SharedButton from "../../components/Shared/SharedButton"
import CorePage from "../../components/Core/CorePage"
import AddressBookEntryForm from "../../components/AddressBook/AddressBookEntryForm"
import AddressBookSettingsItem from "./AddressBookSettingsItem"
import { useBackgroundSelector } from "../../hooks"

/**
 * Every saved address book entry, across all networks, with the networks each
 * one's name applies on.
 */
export default function SettingsAddressBook(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "addressBook" })
  const entries = useBackgroundSelector(selectAddressBookEntries)
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  const [searchTerm, setSearchTerm] = useState("")
  const [editing, setEditing] = useState<AddressBookEntry | undefined>()
  const [isAdding, setIsAdding] = useState(false)

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return [...entries]
      .filter(
        ({ name, address }) =>
          term === "" ||
          name.toLowerCase().includes(term) ||
          address.toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entries, searchTerm])

  return (
    <CorePage hasTabBar>
      <div className="standard_width_padded wrapper">
        <SharedPageHeader withoutBackText backPath="/settings">
          {t("settingsTitle")}
        </SharedPageHeader>
        <div className="add_row">
          <SharedButton
            type="tertiary"
            size="medium"
            iconSmall="add"
            iconPosition="left"
            onClick={() => setIsAdding(true)}
          >
            {t("addButtonSettings")}
          </SharedButton>
        </div>
        {entries.length > 0 && (
          <div className="search_wrap">
            <input
              type="text"
              className="search_input"
              placeholder={t("searchAddresses")}
              spellCheck={false}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <span className="icon_search" />
          </div>
        )}
        <section>
          {filteredEntries.length === 0 ? (
            <p className="empty">
              {entries.length === 0 ? t("empty") : t("noMatches")}
            </p>
          ) : (
            <ul>
              {filteredEntries.map((entry) => (
                <AddressBookSettingsItem
                  key={`${entry.network.chainID}-${entry.address}`}
                  entry={entry}
                  onEdit={() => setEditing(entry)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
      <SharedSlideUpMenu
        isOpen={editing !== undefined}
        size="auto"
        close={() => setEditing(undefined)}
      >
        {editing !== undefined && (
          <AddressBookEntryForm
            entry={editing}
            network={editing.network}
            onSaved={() => setEditing(undefined)}
            onRemoved={() => setEditing(undefined)}
          />
        )}
      </SharedSlideUpMenu>
      <SharedSlideUpMenu
        isOpen={isAdding}
        size="auto"
        close={() => setIsAdding(false)}
      >
        {isAdding && (
          // Saved on the network being viewed unless changed, like a name
          // given from Send.
          <AddressBookEntryForm
            network={currentNetwork}
            onSaved={() => setIsAdding(false)}
          />
        )}
      </SharedSlideUpMenu>
      <style jsx>{`
        .add_row {
          display: flex;
          justify-content: flex-end;
          margin: -12px 0 -8px;
        }
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        ul {
          margin: 0;
          padding: 0;
        }
        .empty {
          color: var(--green-40);
          font-size: 14px;
          line-height: 20px;
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
      `}</style>
    </CorePage>
  )
}
