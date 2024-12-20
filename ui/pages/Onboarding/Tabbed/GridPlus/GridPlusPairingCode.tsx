import React, { useState } from "react"
import { pairGridplusDevice } from "@tallyho/tally-background/redux-slices/gridplus"
import { useTranslation } from "react-i18next"
import SharedInput from "../../../../components/Shared/SharedInput"
import SharedButton from "../../../../components/Shared/SharedButton"
import { useBackgroundDispatch } from "../../../../hooks"
import { useGridPlus } from "../../../../utils/gridplusHooks"

export default function GridPlusPairingCode() {
  const dispatch = useBackgroundDispatch()
  const [formData, setFormData] = useState({ pairingCode: "" })
  const [wrongCodeError, setWrongCodeError] = useState(false)
  const { onPaired } = useGridPlus()
  const { t } = useTranslation("translation", {
    keyPrefix: "gridplus.onboarding",
  })
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    const correctCode = await dispatch(
      pairGridplusDevice({
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
          data-testid="gridplus-pairing-code"
        />
        {wrongCodeError && <p>{t("pairingCodeError")}</p>}
      </div>
      <SharedButton id="formSubmit" isFormSubmit type="primary" size="large">
        {t("pairingSubmit")}
      </SharedButton>
    </form>
  )
}
