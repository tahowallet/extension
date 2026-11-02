import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import type { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import {
  AddressBookUpdateResult,
  removeAddressBookEntry,
  saveAddressBookEntry,
} from "@tallyho/tally-background/redux-slices/address-book"
import {
  selectAddressBookEntriesForNetwork,
  selectNameApplicableNetworks,
} from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import {
  sameEVMAddress,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedNetworkIconStack from "../Shared/SharedNetworkIconStack"

type Props = {
  addressOnNetwork: AddressOnNetwork
  /**
   * The name currently saved for this address on its network, if any. When
   * set, the form edits that entry and offers to remove it.
   */
  savedName?: string
  onSaved?: (name: string) => void
  onRemoved?: () => void
}

/**
 * Adds an address to the address book, or edits or removes the entry saved for
 * it on its network, showing which networks the name will apply on.
 */
export default function AddressBookEntryForm({
  addressOnNetwork,
  savedName,
  onSaved,
  onRemoved,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "addressBook" })
  const dispatch = useBackgroundDispatch()
  const isEditing = savedName !== undefined

  const [name, setName] = useState(savedName ?? "")
  const [error, setError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  const applicableNetworks = useBackgroundSelector((state) =>
    selectNameApplicableNetworks(state, addressOnNetwork),
  )
  const entriesOnNetwork = useBackgroundSelector((state) =>
    selectAddressBookEntriesForNetwork(state, addressOnNetwork.network),
  )

  const validate = (candidate: string): string | undefined => {
    const trimmed = candidate.trim()
    if (trimmed === "") {
      return t("emptyNameError")
    }
    const isTaken = entriesOnNetwork.some(
      (entry) =>
        sameNetwork(entry.network, addressOnNetwork.network) &&
        !sameEVMAddress(entry.address, addressOnNetwork.address) &&
        entry.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    return isTaken ? t("duplicateNameError") : undefined
  }

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault()

    const validationError = validate(name)
    setError(validationError)
    if (validationError !== undefined) {
      return
    }

    setIsSaving(true)
    try {
      const result = (await dispatch(
        saveAddressBookEntry({ ...addressOnNetwork, name: name.trim() }),
      )) as unknown as AddressBookUpdateResult

      if (!result.success) {
        setError(
          result.error === "duplicate-name"
            ? t("duplicateNameError")
            : t("emptyNameError"),
        )
        return
      }

      dispatch(
        setSnackbarMessage(
          isEditing ? t("editedSnackbar") : t("savedSnackbar"),
        ),
      )
      onSaved?.(name.trim())
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    await dispatch(removeAddressBookEntry(addressOnNetwork))
    dispatch(setSnackbarMessage(t("removedSnackbar")))
    onRemoved?.()
  }

  return (
    <form
      className="entry_form standard_width_padded"
      onSubmit={save}
      // Keep keystrokes from reaching list keyboard navigation behind the form.
      onKeyDown={(event) => event.stopPropagation()}
    >
      <h3 className="title">{isEditing ? t("editTitle") : t("addTitle")}</h3>
      <div className="address_row">
        <span className="address" title={addressOnNetwork.address}>
          {truncateAddress(addressOnNetwork.address)}
        </span>
        <SharedNetworkIconStack networks={applicableNetworks} />
      </div>
      <div className="input_wrap">
        <SharedInput
          label={t("nameLabel")}
          value={savedName}
          autoFocus
          autoSelect={isEditing}
          maxLength={64}
          focusedLabelBackgroundColor="var(--green-95)"
          errorMessage={error}
          onChange={(value) => {
            setName(value ?? "")
            if (error !== undefined) {
              setError(validate(value ?? ""))
            }
          }}
        />
      </div>
      <div className="footer">
        <SharedButton
          type="primary"
          size="medium"
          isLoading={isSaving}
          isDisabled={name.trim() === ""}
          onClick={() => save()}
        >
          {isEditing ? t("saveButton") : t("addButton")}
        </SharedButton>
        {isEditing && (
          <SharedButton
            type="tertiaryError"
            size="medium"
            iconSmall="garbage"
            iconPosition="left"
            onClick={remove}
          >
            {t("removeButton")}
          </SharedButton>
        )}
      </div>
      <style jsx>{`
        .entry_form {
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          padding-bottom: 24px;
        }
        .title {
          margin: -6px 0 16px;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          color: var(--text-strong);
        }
        .address_row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 24px;
        }
        .address {
          color: var(--green-40);
          font-size: 16px;
          line-height: 24px;
        }
        .input_wrap {
          margin-bottom: 32px;
        }
        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </form>
  )
}
