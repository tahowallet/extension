import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { importSigner } from "@tallyho/tally-background/redux-slices/keyrings"
import { SignerTypes } from "@tallyho/tally-background/services/keyring"
import classnames from "classnames"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { sendEvent } from "@tallyho/tally-background/redux-slices/ui"
import { OneTimeAnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import SharedButton from "../../../components/Shared/SharedButton"
import PasswordInput from "../../../components/Shared/PasswordInput"
import SharedFileInput from "../../../components/Shared/SharedFileInput"
import SharedLoadingDoggo from "../../../components/Shared/SharedLoadingDoggo"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"

type Props = {
  isImporting: boolean
  setIsImporting: (value: boolean) => void
  finalize: () => void
}

export default function ImportPrivateKeyJSON(props: Props): ReactElement {
  const { setIsImporting, isImporting, finalize } = props

  const keyringImportStatus = useBackgroundSelector(
    (state) => state.keyrings.importing
  )

  const dispatch = useBackgroundDispatch()
  const selectedAccountAddress =
    useBackgroundSelector(selectCurrentAccount).address
  const [file, setFile] = useState("")
  const [password, setPassword] = useState("")

  const [hasError, setHasError] = useState(false)
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
    setHasError(false)
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

  useEffect(() => {
    if (keyringImportStatus === "failed" && isImported) {
      setHasError(true)
      setIsImported(false)
    }

    if (keyringImportStatus === "done" && isImported) {
      dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
    }
  }, [isImported, keyringImportStatus, dispatch])

  const showJSONForm = !isImporting && !isImported

  return (
    <>
      <div
        className={classnames("wrapper hidden_animation", {
          "hidden zero_height": showJSONForm,
        })}
      >
        <div
          className={classnames("wrapper_content hidden_animation", {
            hidden: !isImporting,
          })}
        >
          <SharedLoadingDoggo size={70} />
          <div className="simple_text bold">{t("decrypting")}...</div>
          <div className="simple_text">{t("decryptingTime")}</div>
        </div>

        <div
          className={classnames("wrapper_content hidden_animation", {
            hidden: isImporting,
          })}
        >
          <div className="confetti">🎉</div>
          <div className="simple_text bold">{t("completed")}</div>
          <div className="simple_text">{t("address")}</div>
          <div className="simple_text address">{selectedAccountAddress}</div>
        </div>
      </div>

      <div
        className={classnames("form_wrapper hidden_animation", {
          "hidden zero_height": !showJSONForm,
        })}
      >
        <SharedFileInput
          onFileLoad={onFileLoad}
          fileTypeLabel={t("json")}
          style={{ marginBottom: "24px", width: "356px" }}
        />
        <PasswordInput
          hasPreview
          label={t("password")}
          onChange={(value) => setPassword(value)}
          errorMessage={hasError ? t("wrongPassword") : ""}
        />
      </div>
      <SharedButton
        style={{
          width: "100%",
          maxWidth: "320px",
          marginTop: hasError ? "50px" : "25px",
        }}
        size="medium"
        type="primary"
        isDisabled={!(file && password) || isImporting}
        onClick={isImported ? finalize : importWallet}
        center
      >
        {showJSONForm ? t("decrypt") : t("finalize")}
      </SharedButton>
      <style jsx>{`
        .wrapper {
          background: var(--green-95);
          width: 100%;
          border-radius: 4px;
          height: 185px;
          padding: 15px 0;
          position: relative;
        }
        .wrapper_content {
          position: absolute;
          top: 0;
          display: flex;
          height: 100%;
          width: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
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
          opacity: 0;
          pointer-events: none;
        }
        .zero_height {
          max-height: 0;
          margin: 0;
          padding: 0;
        }
      `}</style>
    </>
  )
}
