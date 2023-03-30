import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { Redirect, useHistory } from "react-router-dom"
import SharedPanelSwitcher from "../../../components/Shared/SharedPanelSwitcher"
import { useAreKeyringsUnlocked } from "../../../hooks"
import ImportForm from "./ImportForm"
import ImportPrivateKey from "./ImportPrivateKey"
import ImportPrivateKeyJSON from "./ImportPrivateKeyJSON"
import OnboardingRoutes from "./Routes"

type Props = {
  nextPage: string
}
export default function ImportPrivateKeyForm(props: Props): ReactElement {
  const { nextPage } = props

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const history = useHistory()

  const [isImporting, setIsImporting] = useState(false)
  const [panelNumber, setPanelNumber] = useState(0)

  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.importPrivateKey",
  })

  const finalize = () => history.push(nextPage)

  if (!areKeyringsUnlocked)
    return (
      <Redirect
        to={{
          pathname: OnboardingRoutes.SET_PASSWORD,
          state: { nextPage: OnboardingRoutes.IMPORT_PRIVATE_KEY },
        }}
      />
    )

  return (
    <>
      <ImportForm
        title={t("title")}
        subtitle={t("subtitle")}
        illustration="doggo_private_key.svg"
      >
        <>
          <div className="panel_wrapper">
            <SharedPanelSwitcher
              setPanelNumber={setPanelNumber}
              panelNumber={panelNumber}
              panelNames={[t("privateKey"), t("json")]}
            />
          </div>
          {panelNumber === 0 ? (
            <ImportPrivateKey
              setIsImporting={setIsImporting}
              finalize={finalize}
            />
          ) : null}
          {panelNumber === 1 ? (
            <ImportPrivateKeyJSON
              setIsImporting={setIsImporting}
              isImporting={isImporting}
              finalize={finalize}
            />
          ) : null}
        </>
      </ImportForm>
      <style jsx>{`
        .panel_wrapper {
          margin-bottom: 16px;
          --panel-switcher-border: var(--green-80);
          --panel-switcher-primary: #fff;
          --panel-switcher-secondary: var(--green-20);
          width: 100%;
        }
      `}</style>
    </>
  )
}
