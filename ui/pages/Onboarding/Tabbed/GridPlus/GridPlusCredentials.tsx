import React, { useState } from "react"
import { connectGridplus } from "@tallyho/tally-background/redux-slices/gridplus"
import { useTranslation } from "react-i18next"
import SharedInput from "../../../../components/Shared/SharedInput"
import SharedButton from "../../../../components/Shared/SharedButton"
import { useBackgroundDispatch } from "../../../../hooks"
import { useGridPlus } from "../../../../utils/gridplusHooks"

const MOCKED_ONBOARDING = process.env.MOCKED_GRIDPLUS_ONBOARDING === "true"

export default function GridPlusCredentials() {
  const dispatch = useBackgroundDispatch()
  const [formData, setFormData] = useState({ deviceId: "", password: "" })
  const { onSignedIn } = useGridPlus()
  const { t } = useTranslation("translation", {
    keyPrefix: "gridplus.onboarding",
  })
  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (MOCKED_ONBOARDING) return onSignedIn(true)
    const permitted = await dispatch(
      connectGridplus({
        deviceId: formData.deviceId,
        password: formData.password,
      }),
    )
    return onSignedIn(permitted)
  }
  return (
    <form onSubmit={onSubmit} className="form-container">
      <header>
        <h1>{t("credentialsTitle")}</h1>
        <p>{t("credentialsDescription")}</p>
      </header>
      <div>
        <SharedInput
          id="deviceId"
          label={t("deviceId")}
          warningMessage={t("deviceIdHelper")}
          value={formData.deviceId}
          onChange={(value) => setFormData({ ...formData, deviceId: value })}
        />
      </div>
      <div>
        <SharedInput
          id="password"
          type="password"
          label={t("password")}
          warningMessage={t("passwordHelper")}
          value={formData.password}
          onChange={(value) => setFormData({ ...formData, password: value })}
        />
      </div>
      <SharedButton id="formSubmit" isFormSubmit type="primary" size="large">
        {t("credentialsSubmit")}
      </SharedButton>
    </form>
  )
}
