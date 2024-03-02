import React, { useState } from "react"
import SharedInput from "../../../../components/Shared/SharedInput"
import SharedButton from "../../../../components/Shared/SharedButton"
import { useGridPlus } from "./GridPlus"
import { useBackgroundDispatch } from "../../../../hooks"
import { pairGridplusDevice } from "@tallyho/tally-background/redux-slices/gridplus"

export default function GridPlusPairingCode() {
  const dispatch = useBackgroundDispatch()
  const [formData, setFormData] = useState({ pairingCode: "" })
  const [wrongCodeError, setWrongCodeError] = useState(false)
  const { onPaired } = useGridPlus()
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    const correctCode = await dispatch(
      pairGridplusDevice({
        pairingCode: formData.pairingCode,
      }),
    )
    if (!correctCode) return setWrongCodeError(true)
    onPaired()
  }
  return (
    <form onSubmit={onSubmit} className="form-container">
      <header>
        <h1>Pairing Code</h1>
        <p>Check your Lattice1 device for the pairing secret.</p>
      </header>
      <div>
        <SharedInput
          id="pairingCode"
          label="Pairing Code"
          warningMessage="Pairing code displayed on your Lattice."
          value={formData.pairingCode}
          onChange={(value) => setFormData({ ...formData, pairingCode: value })}
          data-testid="gridplus-pairing-code"
        />
      </div>
      <SharedButton id="formSubmit" isFormSubmit type="primary" size="large">
        Pair Device
      </SharedButton>
    </form>
  )
}
