import React, { ReactElement } from "react"
import type { AddressBookEntry } from "@tallyho/tally-background/redux-slices/address-book"
import {
  selectAccountTotals,
  selectNameApplicableNetworks,
} from "@tallyho/tally-background/redux-slices/selectors"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import AddressBookListItem from "../../components/AddressBook/AddressBookListItem"
import { useBackgroundSelector } from "../../hooks"

type Props = {
  entry: AddressBookEntry
  onEdit: () => void
}

export default function AddressBookSettingsItem({
  entry,
  onEdit,
}: Props): ReactElement {
  const applicableNetworks = useBackgroundSelector((state) =>
    selectNameApplicableNetworks(state, entry),
  )
  const isOwnAccount = useBackgroundSelector((state) =>
    selectAccountTotals(state).some((account) =>
      sameEVMAddress(account.address, entry.address),
    ),
  )

  return (
    <AddressBookListItem
      name={entry.name}
      address={entry.address}
      isOwnAccount={isOwnAccount}
      applicableNetworks={applicableNetworks}
      onEdit={onEdit}
    />
  )
}
