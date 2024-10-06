import React, { useState } from "react"
import { pairGridPlusDevice } from "@tallyho/tally-background/redux-slices/grid-plus"
import { useTranslation } from "react-i18next"
import SharedInput from "../../../../components/Shared/SharedInput"
import SharedButton from "../../../../components/Shared/SharedButton"
import { useBackgroundDispatch } from "../../../../hooks"
import { useGridPlus } from "../../../../utils/gridPlusHooks"

export default function GridPlusPairingCode() {
  const dispatch = useBackgroundDispatch()
  const [formData, setFormData] = useState({ pairingCode: "" })
  const [wrongCodeError, setWrongCodeError] = useState(false)
  const { onPaired } = useGridPlus()
  const { t } = useTranslation("translation", {
    keyPrefix: "grid-plus.onboarding",
  })
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    const correctCode = await dispatch(
      pairGridPlusDevice({
        pairingCode: formData.pairingCode,
      }),
    )
    if (!correctCode) return setWrongCodeError(true)
    return onPaired()
  }
  return (
    <form onSubmit={onSubmit} className="form-container">
      <header>
        <h1>{t("pairingTitle")}</h1>
        <p>{t("pairingDescription")}</p>
      </header>
      <div>
        <SharedInput
          id="pairingCode"
          label={t("pairingCode")}
          warningMessage={t("pairingCodeHelper")}
          value={formData.pairingCode}
          onChange={(value) => setFormData({ ...formData, pairingCode: value })}
          data-testid="grid-plus-pairing-code"
        />
        {wrongCodeError && <p>{t("pairingCodeError")}</p>}
      </div>
      <SharedButton id="formSubmit" isFormSubmit type="primary" size="large">
        {t("pairingSubmit")}
      </SharedButton>
    </form>
  )
}
