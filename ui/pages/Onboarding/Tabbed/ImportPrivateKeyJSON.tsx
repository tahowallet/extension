import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { importSigner } from "@tallyho/tally-background/redux-slices/keyrings"
import { useDispatch } from "react-redux"
import { SignerTypes } from "@tallyho/tally-background/services/keyring"
import SharedButton from "../../../components/Shared/SharedButton"
import PasswordInput from "../../../components/Shared/PasswordInput"
import SharedFileInput from "../../../components/Shared/SharedFileInput"

type Props = {
  isImporting: boolean
  setIsImporting: (value: boolean) => void
}

export default function ImportPrivateKeyJSON(props: Props): ReactElement {
  const { setIsImporting, isImporting } = props

  const dispatch = useDispatch()

  const [file, setFile] = useState("")
  const [password, setPassword] = useState("")

  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.importPrivateKey",
  })

  const onFileLoad = (fileReader: FileReader | null) => {
    setFile(fileReader?.result?.toString() ?? "")
  }

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
  }, [dispatch, file, password, setIsImporting])

  return (
    <>
      <SharedFileInput
        onFileLoad={onFileLoad}
        disabled={isImporting}
        fileTypeLabel={t("json")}
        style={{ marginBottom: "24px", width: "356px" }}
      />
      <PasswordInput
        hasPreview
        label={t("password")}
        onChange={(value) => setPassword(value)}
      />
      <SharedButton
        style={{ width: "100%", maxWidth: "320px", marginTop: "25px" }}
        size="medium"
        type="primary"
        isDisabled={!(file && password) || isImporting}
        onClick={importWallet}
        center
      >
        {isImporting ? "Import in progress..." : t("submit")}
      </SharedButton>
      <style jsx>{`
        input[type="file"] {
          margin-bottom: 25px;
        }
      `}</style>
    </>
  )
}
