import { exportPrivateKey } from "@tallyho/tally-background/redux-slices/internal-signer"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { useBackgroundDispatch } from "../../hooks"
import SharedSecretText from "../Shared/SharedSecretText"
import SharedButton from "../Shared/SharedButton"
import CopyToClipboard from "./CopyToClipboard"
import PasswordInput from "../Shared/PasswordInput"

export default function RevealPrivateKey({
  address,
}: {
  address: string
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showPrivateKey",
  })
  const { t: tKeyring } = useTranslation("translation", {
    keyPrefix: "keyring.unlock",
  })
  const dispatch = useBackgroundDispatch()
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [privateKey, setPrivateKey] = useState("")

  const handleSubmit = async () => {
    setPasswordError("")
    const key = (await dispatch(
      exportPrivateKey({ address, password }),
    )) as unknown as AsyncThunkFulfillmentType<typeof exportPrivateKey>

    if (key) {
      setPrivateKey(key)
    } else {
      setPasswordError(tKeyring("error.incorrect"))
    }
  }

  if (!privateKey) {
    return (
      <div className="password_form">
        <PasswordInput
          label={tKeyring("signingPassword")}
          value={password}
          onChange={(value) => setPassword(value ?? "")}
          errorMessage={passwordError}
          focusedLabelBackgroundColor="var(--hunter-green)"
        />
        <div>
          <SharedButton type="primary" size="medium" onClick={handleSubmit}>
            {tKeyring("submitBtn")}
          </SharedButton>
        </div>
        <style jsx>{`
          .password_form {
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      <div className="key_container">
        <SharedSecretText text={privateKey} label={t("privateKey")} />
        <CopyToClipboard
          copyText={t("exportingPrivateKey.copyBtn")}
          copy={() => {
            navigator.clipboard.writeText(privateKey)
            dispatch(setSnackbarMessage(t("exportingPrivateKey.copySuccess")))
          }}
        />
      </div>
      <style jsx>{`
        .key_container {
          display: flex;
          flex-direction: column;
          height: 191px;
        }
      `}</style>
    </>
  )
}
