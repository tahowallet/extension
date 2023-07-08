import { exportPrivateKey } from "@tallyho/tally-background/redux-slices/internal-signer"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { useBackgroundDispatch } from "../../hooks"
import SharedSecretText from "../Shared/SharedSecretText"
import CopyToClipboard from "./CopyToClipboard"

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
      const key = (await dispatch(
        exportPrivateKey(address)
      )) as unknown as AsyncThunkFulfillmentType<typeof exportPrivateKey>

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
