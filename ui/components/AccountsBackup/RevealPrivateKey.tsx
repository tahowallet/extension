import { exportPrivateKey } from "@tallyho/tally-background/redux-slices/keyrings"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSecretText from "../Shared/SharedSecretText"

export default function RevealPrivateKey({
  address,
}: {
  address: string
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showPrivateKey",
  })
  const dispatch = useBackgroundDispatch()
  const [privateKey, setPrivateKey] = useState("")

  useEffect(() => {
    const fetchPrivateKey = async () => {
      const key = (await dispatch(exportPrivateKey(address))) as unknown as
        | string
        | null

      if (key) {
        setPrivateKey(key)
      }
    }

    fetchPrivateKey()
  }, [dispatch, address])

  return (
    <>
      <div className="key_container">
        <SharedSecretText text={privateKey} label={t("privateKey")} />
        <SharedButton
          type="tertiary"
          size="small"
          iconMedium="copy"
          onClick={() => {
            navigator.clipboard.writeText(privateKey)
            dispatch(setSnackbarMessage(t("exportingPrivateKey.copySuccess")))
          }}
          center
        >
          {t("exportingPrivateKey.copyBtn")}
        </SharedButton>
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
