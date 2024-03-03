import React, { useEffect, useState } from "react"
import SharedButton from "../../../../components/Shared/SharedButton"
import SharedCheckbox from "../../../../components/Shared/SharedCheckbox"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import {
  fetchGridPlusAddresses,
  importGridPlusAddresses,
} from "@tallyho/tally-background/redux-slices/gridplus"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { useGridPlus } from "./GridPlus"
import { GridPlusAddress } from "@tallyho/tally-background/services/gridplus"

const useImportableAddresses = () =>
  useBackgroundSelector((state) => state.gridplus.importableAddresses)

export default function GridPlusImportAddresses() {
  const [selectedAddresses, setSelectedAddresses] = useState<GridPlusAddress[]>(
    [],
  )
  const importableAddresses = useImportableAddresses()
  const dispatch = useBackgroundDispatch()
  const { onImported } = useGridPlus()
  const toggleAddress = ({
    address,
    addressIndex,
  }: {
    address: string
    addressIndex: number
  }) => {
    const selected = selectedAddresses.some(
      (account) => account.address === address,
    )
    if (selected)
      return setSelectedAddresses(
        selectedAddresses.filter(
          (selectedAddress) => selectedAddress.address !== address,
        ),
      )
    setSelectedAddresses([...selectedAddresses, { address, addressIndex }])
  }
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    await dispatch(importGridPlusAddresses({ addresses: selectedAddresses }))
    onImported()
  }
  useEffect(() => {
    dispatch(fetchGridPlusAddresses({}))
  }, [])
  return (
    <form onSubmit={onSubmit} className="form-container">
      <header>
        <h1>Choose Addresses</h1>
        <p>Addresses available for an import from your Lattice1.</p>
      </header>
      <div className="addresses-list">
        {importableAddresses.map((address, i) => (
          <SharedCheckbox
            key={address}
            label={truncateAddress(address)}
            checked={selectedAddresses.some(
              (account) => account.address === address,
            )}
            onChange={() => toggleAddress({ address, addressIndex: i })}
          />
        ))}
      </div>
      <SharedButton
        id="formSubmit"
        type="primary"
        size="large"
        isDisabled={selectedAddresses.length === 0}
        isFormSubmit
      >
        Import Addresses
      </SharedButton>
      <style jsx>{`
        .addresses-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background-color: var(--green-120);
          border-radius: 1rem;
          padding: 1.5rem 2rem;
        }
      `}</style>
    </form>
  )
}
