import React, { ReactElement, useMemo, useState } from "react"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import type { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import {
  AddressBookEntry,
  AddressBookUpdateResult,
  removeAddressBookEntry,
  saveAddressBookEntry,
} from "@tallyho/tally-background/redux-slices/address-book"
import {
  selectAddressBookEntries,
  selectKnownCompatibleChainIDs,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectEVMNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import {
  selectShowTestNetworks,
  setSnackbarMessage,
} from "@tallyho/tally-background/redux-slices/ui"
import { TEST_NETWORK_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import {
  isProbablyEVMAddress,
  normalizeEVMAddress,
  sameEVMAddress,
} from "@tallyho/tally-background/lib/utils"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import SharedNetworkIconStack from "../Shared/SharedNetworkIconStack"

type Props = {
  /** The entry being edited. Without one, the form adds a new entry. */
  entry?: Pick<
    AddressBookEntry,
    "address" | "network" | "name" | "additionalChainIDs"
  >
  /**
   * For a new entry, the address to name. Without one, the form asks for it.
   */
  address?: string
  /** For a new entry, the network the name is saved on unless changed. */
  network: EVMNetwork
  onSaved?: (name: string, addressOnNetwork: AddressOnNetwork) => void
  onRemoved?: () => void
}

/**
 * Adds an address to the address book, or edits or removes an entry, and
 * chooses the networks its name applies on.
 *
 * The name always applies where the wallet knows the same signer controls the
 * address (see RFB 5); those networks are shown checked and can't be
 * unchecked. Any other network is the user's call, so choosing one shows a
 * warning to make sure the same owner controls the address there.
 */
export default function AddressBookEntryForm({
  entry,
  address: givenAddress,
  network: givenNetwork,
  onSaved,
  onRemoved,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "addressBook" })
  const dispatch = useBackgroundDispatch()
  const isEditing = entry !== undefined
  const asksForAddress = !isEditing && givenAddress === undefined
  const initialNetwork = entry?.network ?? givenNetwork

  const [name, setName] = useState(entry?.name ?? "")
  const [error, setError] = useState<string | undefined>()
  const [enteredAddress, setEnteredAddress] = useState("")
  const [addressError, setAddressError] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isChoosingNetworks, setIsChoosingNetworks] = useState(false)
  // The networks the user explicitly applies the name on, in addition to the
  // ones it applies on through control compatibility.
  const [chosenChainIDs, setChosenChainIDs] = useState<Set<string>>(
    () =>
      new Set([initialNetwork.chainID, ...(entry?.additionalChainIDs ?? [])]),
  )

  const address =
    entry?.address ??
    givenAddress ??
    (isProbablyEVMAddress(enteredAddress.trim())
      ? normalizeEVMAddress(enteredAddress.trim())
      : undefined)

  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  const allNetworks = useBackgroundSelector(selectEVMNetworks)
  const networks = useMemo(
    () =>
      allNetworks.filter(
        (network) =>
          showTestNetworks ||
          !TEST_NETWORK_BY_CHAIN_ID.has(network.chainID) ||
          chosenChainIDs.has(network.chainID),
      ),
    [allNetworks, chosenChainIDs, showTestNetworks],
  )

  // The entry is saved on the network it started on while that stays chosen,
  // and otherwise on the first chosen network.
  const savedNetwork =
    (chosenChainIDs.has(initialNetwork.chainID)
      ? initialNetwork
      : networks.find(({ chainID }) => chosenChainIDs.has(chainID))) ??
    initialNetwork

  const savedAddressOnNetwork = useMemo(
    () => ({ address: address ?? "", network: savedNetwork }),
    [address, savedNetwork],
  )
  const compatibleChainIDs = useBackgroundSelector((state) =>
    selectKnownCompatibleChainIDs(state, savedAddressOnNetwork),
  )

  const appliesOn = networks.filter(
    ({ chainID }) =>
      chosenChainIDs.has(chainID) || compatibleChainIDs.has(chainID),
  )
  // Networks the user vouches for beyond where the entry is saved and where
  // the wallet already knows the address is controlled by the same signer.
  const vouchedChainIDs = [...chosenChainIDs].filter(
    (chainID) =>
      chainID !== savedNetwork.chainID && !compatibleChainIDs.has(chainID),
  )

  const entries = useBackgroundSelector(selectAddressBookEntries)

  const validateAddress = (candidate: string): string | undefined =>
    isProbablyEVMAddress(candidate.trim())
      ? undefined
      : t("invalidAddressError")

  const validate = (candidate: string): string | undefined => {
    const trimmed = candidate.trim().toLowerCase()
    if (trimmed === "") {
      return t("emptyNameError")
    }
    const appliesOnChainIDs = new Set(appliesOn.map(({ chainID }) => chainID))
    const isTaken = entries.some(
      (other) =>
        !sameEVMAddress(other.address, address) &&
        other.name.trim().toLowerCase() === trimmed &&
        [other.network.chainID, ...other.additionalChainIDs].some((chainID) =>
          appliesOnChainIDs.has(chainID),
        ),
    )
    return isTaken ? t("duplicateNameError") : undefined
  }

  const toggleNetwork = (chainID: string, isChosen: boolean) => {
    setChosenChainIDs((previous) => {
      const next = new Set(previous)
      if (isChosen) {
        next.add(chainID)
      } else if (next.size > 1) {
        // The name has to be saved somewhere.
        next.delete(chainID)
      }
      return next
    })
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
        saveAddressBookEntry({
          address,
          network: savedNetwork,
          name: name.trim(),
          additionalChainIDs: vouchedChainIDs,
          previousNetwork: entry?.network,
        }),
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
      onSaved?.(name.trim(), { address, network: savedNetwork })
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async () => {
    if (entry === undefined) {
      return
    }
    await dispatch(
      removeAddressBookEntry({
        address: entry.address,
        network: entry.network,
      }),
    )
    dispatch(setSnackbarMessage(t("removedSnackbar")))
    onRemoved?.()
  }

  return (
    // The global stylesheet has forms inherit every property from their
    // parent, so the form gets a plain container rather than sitting directly
    // in a slide-up, whose fixed positioning it would otherwise take on.
    <div className="entry_form standard_width_padded center_horizontal">
      <form
        className="entry_fields"
        onSubmit={save}
        // Keep keystrokes from reaching list keyboard navigation behind it.
        onKeyDown={(event) => event.stopPropagation()}
      >
        <h3 className="title">{isEditing ? t("editTitle") : t("addTitle")}</h3>

        {asksForAddress ? (
          <div className="field">
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
        ) : (
          <p className="address" title={address}>
            {address}
          </p>
        )}

        <div className="field">
          <SharedInput
            id="address_book_entry_name"
            label={t("nameLabel")}
            value={entry?.name}
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

        <section className="networks">
          <button
            type="button"
            className="networks_toggle"
            aria-expanded={isChoosingNetworks}
            aria-controls="address_book_entry_networks"
            onClick={() => setIsChoosingNetworks((previous) => !previous)}
          >
            <span className="networks_label">{t("appliesOnLabel")}</span>
            <SharedNetworkIconStack networks={appliesOn} />
            <span className="networks_summary">
              {appliesOn.length > 1
                ? t("appliesOnSummary", {
                    network: appliesOn[0].name,
                    count: appliesOn.length - 1,
                  })
                : (appliesOn[0] ?? savedNetwork).name}
            </span>
            <span
              className={classNames("chevron", { open: isChoosingNetworks })}
            />
          </button>

          {isChoosingNetworks && (
            <ul id="address_book_entry_networks" className="network_options">
              {networks.map((network) => {
                const isCompatible =
                  compatibleChainIDs.has(network.chainID) &&
                  !chosenChainIDs.has(network.chainID)
                const isChosen = chosenChainIDs.has(network.chainID)
                return (
                  <li key={network.chainID}>
                    <label
                      className={classNames("network_option", {
                        disabled: isCompatible,
                      })}
                    >
                      <input
                        type="checkbox"
                        checked={isChosen || isCompatible}
                        disabled={
                          isCompatible ||
                          (isChosen && chosenChainIDs.size === 1)
                        }
                        onChange={(event) =>
                          toggleNetwork(network.chainID, event.target.checked)
                        }
                      />
                      <SharedNetworkIcon network={network} size={16} />
                      <span className="network_name">{network.name}</span>
                      {isCompatible && (
                        <span className="network_tag">{t("sameKeysTag")}</span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          {vouchedChainIDs.length > 0 && (
            <p className="ownership_warning" role="alert">
              {t("ownershipWarning")}
            </p>
          )}
        </section>

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
      </form>

      <style jsx>{`
        .entry_form {
          box-sizing: border-box;
          padding-bottom: 24px;
        }
        .entry_fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        .title {
          /* Clears the slide-up's close button, which sits on this line. */
          margin: 0;
          padding-right: 32px;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          color: var(--text-strong);
        }
        .address {
          margin: 0;
          color: var(--green-40);
          font-size: 14px;
          line-height: 20px;
          word-break: break-all;
        }
        .field {
          /* Room for SharedInput's floating label and validation message. */
          padding-top: 4px;
        }
        .networks {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .networks_toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          box-sizing: border-box;
          padding: 8px 12px;
          border-radius: 4px;
          background-color: var(--hunter-green);
          color: var(--green-20);
          font-size: 14px;
          line-height: 20px;
          text-align: left;
        }
        .networks_label {
          color: var(--green-40);
          flex-shrink: 0;
        }
        .networks_summary {
          flex-grow: 1;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .chevron {
          flex-shrink: 0;
          width: 12px;
          height: 8px;
          mask: url("./images/chevron_down.svg") center / 12px 8px no-repeat;
          background-color: var(--green-40);
          transition: transform var(--fade);
        }
        .chevron.open {
          transform: rotate(180deg);
        }
        .network_options {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 176px;
          overflow-y: auto;
          margin: 0;
          padding: 4px 12px;
        }
        .network_options li {
          display: block;
        }
        .network_option {
          cursor: pointer;
          display: flex;
          /* Labels are columns by default in this codebase. */
          flex-direction: row;
          margin: 0;
          align-items: center;
          gap: 8px;
          min-height: 28px;
          font-size: 14px;
          line-height: 20px;
          color: var(--green-20);
        }
        .network_option.disabled {
          cursor: default;
        }
        .network_option input {
          /* Undo the global reset, which leaves checkboxes invisible. */
          all: revert;
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          margin: 0;
          accent-color: var(--trophy-gold);
        }
        .network_name {
          flex-grow: 1;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .network_tag {
          flex-shrink: 0;
          color: var(--green-40);
          font-size: 12px;
        }
        .ownership_warning {
          margin: 0;
          padding: 8px 12px;
          border-radius: 4px;
          border: 1px solid var(--attention);
          color: var(--attention);
          font-size: 14px;
          line-height: 20px;
        }
        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }
      `}</style>
    </div>
  )
}
