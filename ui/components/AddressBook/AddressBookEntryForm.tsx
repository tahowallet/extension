import React, { ReactElement, useMemo, useState } from "react"
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
  isProbablyEVMAddress,
  normalizeEVMAddress,
  sameEVMAddress,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import { EVMNetwork, sameNetwork } from "@tallyho/tally-background/networks"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedNetworkIconStack from "../Shared/SharedNetworkIconStack"

type Props = {
  /**
   * The address to name, and the network to save the name on. With only a
   * network, the form asks for the address too.
   */
  addressOnNetwork:
    | AddressOnNetwork
    | { address?: undefined; network: EVMNetwork }
  /**
   * The name currently saved for this address on its network, if any. When
   * set, the form edits that entry and offers to remove it.
   */
  savedName?: string
  onSaved?: (name: string, addressOnNetwork: AddressOnNetwork) => void
  onRemoved?: () => void
}

/**
 * Adds an address to the address book, or edits or removes the entry saved for
 * it on its network, showing which networks the name will apply on.
 */
export default function AddressBookEntryForm({
  addressOnNetwork: givenAddressOnNetwork,
  savedName,
  onSaved,
  onRemoved,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "addressBook" })
  const dispatch = useBackgroundDispatch()
  const isEditing = savedName !== undefined

  const asksForAddress = givenAddressOnNetwork.address === undefined
  const { network } = givenAddressOnNetwork

  const [name, setName] = useState(savedName ?? "")
  const [error, setError] = useState<string | undefined>()
  const [enteredAddress, setEnteredAddress] = useState("")
  const [addressError, setAddressError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  const address =
    givenAddressOnNetwork.address ??
    (isProbablyEVMAddress(enteredAddress.trim())
      ? normalizeEVMAddress(enteredAddress.trim())
      : undefined)
  // Until an address is entered, the name can only apply where it's saved.
  const addressOnNetwork = useMemo(
    () => ({ address: address ?? "", network }),
    [address, network],
  )

  const applicableNetworks = useBackgroundSelector((state) =>
    selectNameApplicableNetworks(state, addressOnNetwork),
  )
  const entriesOnNetwork = useBackgroundSelector((state) =>
    selectAddressBookEntriesForNetwork(state, addressOnNetwork.network),
  )

  const validateAddress = (candidate: string): string | undefined =>
    isProbablyEVMAddress(candidate.trim())
      ? undefined
      : t("invalidAddressError")

  const validate = (candidate: string): string | undefined => {
    const trimmed = candidate.trim()
    if (trimmed === "") {
      return t("emptyNameError")
    }
    const isTaken = entriesOnNetwork.some(
      (entry) =>
        sameNetwork(entry.network, addressOnNetwork.network) &&
        !sameEVMAddress(entry.address, address) &&
        entry.name.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    return isTaken ? t("duplicateNameError") : undefined
  }

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault()

    const validationError = validate(name)
    setError(validationError)
    const enteredAddressError = asksForAddress
      ? validateAddress(enteredAddress)
      : undefined
    setAddressError(enteredAddressError)
    if (
      validationError !== undefined ||
      enteredAddressError !== undefined ||
      address === undefined
    ) {
      return
    }

    setIsSaving(true)
    try {
      const result = (await dispatch(
        saveAddressBookEntry({ address, network, name: name.trim() }),
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
      onSaved?.(name.trim(), { address, network })
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    if (address === undefined) {
      return
    }
    await dispatch(removeAddressBookEntry({ address, network }))
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
      {asksForAddress ? (
        <div className="address_input_row">
          <div className="address_input">
            <SharedInput
              id="address_book_entry_address"
              label={t("addressLabel")}
              placeholder="0x..."
              autoFocus
              focusedLabelBackgroundColor="var(--green-95)"
              errorMessage={addressError}
              onChange={(value) => {
                setEnteredAddress(value ?? "")
                if (addressError !== undefined) {
                  setAddressError(validateAddress(value ?? ""))
                }
              }}
            />
          </div>
          <SharedNetworkIconStack networks={applicableNetworks} />
        </div>
      ) : (
        <div className="address_row">
          <span className="address" title={addressOnNetwork.address}>
            {truncateAddress(addressOnNetwork.address)}
          </span>
          <SharedNetworkIconStack networks={applicableNetworks} />
        </div>
      )}
      <div className="input_wrap">
        <SharedInput
          id="address_book_entry_name"
          label={t("nameLabel")}
          value={savedName}
          autoFocus={!asksForAddress}
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
          isDisabled={
            name.trim() === "" ||
            (asksForAddress && enteredAddress.trim() === "")
          }
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
        .address_input_row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .address_input {
          flex-grow: 1;
          min-width: 0;
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
