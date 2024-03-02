import React, { useEffect, useState } from "react"
import SharedButton from "../../../../components/Shared/SharedButton"
import SharedCheckbox from "../../../../components/Shared/SharedCheckbox"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import { fetchGridPlusAddresses } from "@tallyho/tally-background/redux-slices/gridplus"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"

const useImportableAddresses = () =>
  useBackgroundSelector((state) => state.gridplus.importableAddresses)

export default function GridPlusImportAddresses() {
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([])
  const importableAddresses = useImportableAddresses()
  const dispatch = useBackgroundDispatch()
  const toggleAddress = (address: string) => {
    const selected = selectedAddresses.includes(address)
    if (selected)
      return setSelectedAddresses(
        selectedAddresses.filter(
          (selectedAddress) => selectedAddress !== address,
        ),
      )
    setSelectedAddresses([...selectedAddresses, address])
  }
  useEffect(() => {
    dispatch(fetchGridPlusAddresses({}))
  }, [])
  return (
    <form className="form-container">
      <header>
        <h1>Choose Addresses</h1>
        <p>Addresses available for an import from your Lattice1.</p>
      </header>
      <div className="addresses-list">
        {importableAddresses.map((address) => (
          <SharedCheckbox
            key={address}
            label={truncateAddress(address)}
            checked={selectedAddresses.includes(address)}
            onChange={() => toggleAddress(address)}
          />
        ))}
      </div>
      <SharedButton id="formSubmit" type="primary" size="large">
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
