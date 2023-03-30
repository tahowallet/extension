import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { importSigner } from "@tallyho/tally-background/redux-slices/keyrings"
import { useDispatch } from "react-redux"
import { SignerTypes } from "@tallyho/tally-background/services/keyring"
import classnames from "classnames"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import SharedButton from "../../../components/Shared/SharedButton"
import PasswordInput from "../../../components/Shared/PasswordInput"
import SharedFileInput from "../../../components/Shared/SharedFileInput"
import SharedLoadingDoggo from "../../../components/Shared/SharedLoadingDoggo"
import { useBackgroundSelector } from "../../../hooks"

type Props = {
  isImporting: boolean
  setIsImporting: (value: boolean) => void
  finalize: () => void
}

export default function ImportPrivateKeyJSON(props: Props): ReactElement {
  const { setIsImporting, isImporting, finalize } = props

  const dispatch = useDispatch()
  const selectedAccountAddress =
    useBackgroundSelector(selectCurrentAccount).address
  const [file, setFile] = useState("")
  const [password, setPassword] = useState("")

  const [isImported, setIsImported] = useState(false)

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

    await dispatch(
      importSigner({
        type: SignerTypes.jsonFile,
        jsonFile: file,
        password,
      })
    )
    setIsImporting(false)
    setIsImported(true)
  }, [dispatch, file, password, setIsImporting])

  return (
    <>
      <div
        className={classnames("loader_wrapper hidden_animation", {
          hidden: !isImporting || isImported,
        })}
      >
        <SharedLoadingDoggo size={70} />
        <div className="simple_text bold">{t("decrypting")}...</div>
        <div className="simple_text">{t("decryptingTime")}</div>
      </div>
      <div
        className={classnames("completed_wrapper hidden_animation", {
          hidden: !isImported,
        })}
      >
        <div className="confetti">🎉</div>
        <div className="simple_text bold">{t("completed")}</div>
        <div className="simple_text">{t("address")}</div>
        <div className="simple_text address">{selectedAccountAddress}</div>
      </div>
      <div
        className={classnames("form_wrapper hidden_animation", {
          hidden: isImporting || isImported,
        })}
      >
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
      </div>
      <SharedButton
        style={{ width: "100%", maxWidth: "320px", marginTop: "25px" }}
        size="medium"
        type="primary"
        isDisabled={!(file && password) || isImporting}
        onClick={isImported ? finalize : importWallet}
        center
      >
        {isImporting || isImported ? t("finalize") : t("decrypt")}
      </SharedButton>
      <style jsx>{`
        .loader_wrapper {
          background: var(--green-95);
          padding: 30px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-height: 185px;
          border-radius: 4px;
        }
        .completed_wrapper {
          width: 100%;
          background: var(--green-95);
          padding: 15px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-radius: 4px;
        }
        .simple_text.bold {
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          color: var(--white);
          margin-bottom: 4px;
        }
        .simple_text.address {
          color: var(--white);
          font-weight: 500;
          word-wrap: break-word;
          text-align: center;
          width: 80%;
        }
        .form_wrapper {
          max-height: 230px;
        }
        .hidden_animation {
          transition: all 300ms ease-in-out;
        }
        .confetti {
          font-size: 36px;
          margin-bottom: 4px;
        }
        .hidden {
          margin: 0;
          padding: 0;
          opacity: 0;
          max-height: 0;
          pointer-events: none;
        }
      `}</style>
    </>
  )
}
