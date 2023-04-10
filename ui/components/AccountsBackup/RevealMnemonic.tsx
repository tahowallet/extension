import { exportMnemonic } from "@tallyho/tally-background/redux-slices/keyrings"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSecretText from "../Shared/SharedSecretText"

function MnemonicList(props: {
  mnemonic: string
  startIndex: number
  endIndex?: number
}): ReactElement {
  const { mnemonic, startIndex, endIndex } = props
  if (!mnemonic.length) return <></>

  const splitedMnemonic = mnemonic.split(" ").slice(startIndex, endIndex)

  return (
    <div className="mnemonic_list">
      {splitedMnemonic.map((word, index) => (
        <div key={`${word}}`}>
          {startIndex + index + 1} - {word}
        </div>
      ))}
      <style jsx>{`
        .mnemonic_list {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
      `}</style>
    </div>
  )
}

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

  const splitIndex = mnemonic.split(" ").length === 12 ? 6 : 12

  return (
    <>
      <div className="mnemonic_container">
        <SharedSecretText
          text={
            <MnemonicList
              mnemonic={mnemonic}
              startIndex={0}
              endIndex={splitIndex}
            />
          }
          width="50%"
        />
        <SharedSecretText
          text={<MnemonicList mnemonic={mnemonic} startIndex={splitIndex} />}
          width="50%"
        />
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