import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Redirect, useHistory } from "react-router-dom"
import { importSigner } from "@tallyho/tally-background/redux-slices/keyrings"
import { useDispatch } from "react-redux"
import { SignerTypes } from "@tallyho/tally-background/services/keyring"
import SharedButton from "../../../components/Shared/SharedButton"
import { useAreKeyringsUnlocked, useBackgroundSelector } from "../../../hooks"
import ImportForm from "./ImportForm"
import PasswordInput from "../../../components/Shared/PasswordInput"
import OnboardingRoutes from "./Routes"

type Props = {
  nextPage: string
}

export default function ImportPrivateKey(props: Props): ReactElement {
  const { nextPage } = props

  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const keyringImport = useBackgroundSelector(
    (state) => state.keyrings.importing
  )
  const history = useHistory()
  const dispatch = useDispatch()

  const [file, setFile] = useState("")
  const [password, setPassword] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.importPrivateKey",
  })

  const handleChange = useCallback((event) => {
    const fileReader = new FileReader()
    fileReader.readAsText(event.target.files[0], "UTF-8")
    fileReader.onload = (e) => {
      if (e.target?.result) {
        setFile(e.target?.result.toString())
      }
    }
  }, [])

  const importWallet = useCallback(async () => {
    if (!password || !file) {
      return
    }

    setIsImporting(true)

    dispatch(
      importSigner({
        type: SignerTypes.jsonFile,
        jsonFile: file,
        password,
      })
    )
  }, [dispatch, file, password])

  useEffect(() => {
    if (areKeyringsUnlocked && keyringImport === "done" && isImporting) {
      setIsImporting(false)
      history.push(nextPage)
    }
  }, [history, areKeyringsUnlocked, keyringImport, nextPage, isImporting])

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
          <input type="file" onChange={handleChange} disabled={isImporting} />
          <PasswordInput
            hasPreview
            label="File password"
            onChange={(value) => setPassword(value)}
          />
          <SharedButton
            style={{ width: "100%", maxWidth: "300px", marginTop: "25px" }}
            size="medium"
            type="primary"
            isDisabled={!(file && password) || isImporting}
            onClick={importWallet}
            center
          >
            {isImporting ? "Import in progress..." : t("submit")}
          </SharedButton>
        </>
      </ImportForm>
      <style jsx>{`
        input[type="file"] {
          margin-bottom: 25px;
        }
        .bottom {
          width: 100%;
          margin: 25px auto 0;
        }
      `}</style>
    </>
  )
}
