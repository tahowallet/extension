import React, { useEffect, useState } from "react"
import {
  fetchGridPlusAddresses,
  importGridPlusAddresses,
} from "@tallyho/tally-background/redux-slices/gridplus"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { GridPlusAddress } from "@tallyho/tally-background/services/gridplus"
import { useTranslation } from "react-i18next"
import SharedButton from "../../../../components/Shared/SharedButton"
import SharedCheckbox from "../../../../components/Shared/SharedCheckbox"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import { useGridPlus } from "../../../../utils/gridplusHooks"

const useImportableAddresses = () =>
  useBackgroundSelector((state) => state.gridplus.importableAddresses)

export default function GridPlusImportAddresses() {
  const [selectedAddresses, setSelectedAddresses] = useState<GridPlusAddress[]>(
    [],
  )
  const importableAddresses = useImportableAddresses()
  const dispatch = useBackgroundDispatch()
  const { onImported } = useGridPlus()
  const { t } = useTranslation("translation", {
    keyPrefix: "gridplus.onboarding",
  })
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
    return setSelectedAddresses([
      ...selectedAddresses,
      {
        address,
        addressIndex,
        path: [0x80000000 + 44, 0x80000000 + 60, 0x80000000, 0, addressIndex],
      },
    ])
  }
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    await dispatch(importGridPlusAddresses({ addresses: selectedAddresses }))
    return onImported()
  }
  useEffect(() => {
    dispatch(fetchGridPlusAddresses({}))
  }, [dispatch])
  return (
    <form onSubmit={onSubmit} className="form-container">
      <header>
        <h1>{t("importTitle")}</h1>
        <p>{t("importDescription")}</p>
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
        {t("importSubmit")}
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
