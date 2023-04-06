import { exportMnemonic } from "@tallyho/tally-background/redux-slices/keyrings"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSecretText from "../Shared/SharedSecretText"

export default function RevealMnemonic({
  address,
}: {
  address: string
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showMnemonic",
  })
  const dispatch = useBackgroundDispatch()
  const [mnemonic, setMnemonic] = useState("")

  useEffect(() => {
    const fetchMnemonic = async () => {
      const mnemonicText = (await dispatch(
        exportMnemonic(address)
      )) as unknown as string | null

      if (mnemonicText) {
        setMnemonic(mnemonicText)
      }
    }

    fetchMnemonic()
  }, [dispatch, address])

  return (
    <>
      <div className="mnemonic_container">
        <SharedSecretText text={mnemonic} width="50%" />
        <SharedSecretText text={mnemonic} width="50%" />
      </div>
      <SharedButton
        type="tertiary"
        size="small"
        iconMedium="copy"
        onClick={() => {
          navigator.clipboard.writeText(mnemonic)
          dispatch(setSnackbarMessage(t("exportingMnemonic.copySuccess")))
        }}
        center
      >
        {t("exportingMnemonic.copyBtn")}
      </SharedButton>
      <style jsx>{`
        .mnemonic_container {
          display: flex;
          height: 370px;
        }
      `}</style>
    </>
  )
}
