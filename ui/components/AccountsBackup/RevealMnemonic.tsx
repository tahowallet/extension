import { exportMnemonic } from "@tallyho/tally-background/redux-slices/internal-signer"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { useBackgroundDispatch } from "../../hooks"
import SharedSecretText from "../Shared/SharedSecretText"
import CopyToClipboard from "./CopyToClipboard"

function MnemonicList(props: {
  mnemonic: string
  startIndex: number
  endIndex?: number
}): ReactElement | null {
  const { mnemonic, startIndex, endIndex } = props
  if (!mnemonic.length) return null

  const splitMnemonic = mnemonic.split(" ").slice(startIndex, endIndex)

  return (
    <div className="mnemonic_list">
      {splitMnemonic.map((word, index) => (
        <div key={`${word}_${index + 1}}`}>
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
      )) as unknown as AsyncThunkFulfillmentType<typeof exportMnemonic>

      if (mnemonicText) {
        setMnemonic(mnemonicText)
      }
    }

    fetchMnemonic()
  }, [dispatch, address])

  const splitIndex = mnemonic.split(" ").length === 12 ? 6 : 12

  return (
    <>
      <div
        className={classNames("mnemonic_container", {
          small: splitIndex === 6,
        })}
      >
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
      <CopyToClipboard
        copyText={t("exportingMnemonic.copyBtn")}
        copy={() => {
          navigator.clipboard.writeText(mnemonic)
          dispatch(setSnackbarMessage(t("exportingMnemonic.copySuccess")))
        }}
      />
      <style jsx>{`
        .mnemonic_container {
          display: flex;
          height: 370px;
        }
        .mnemonic_container.small {
          height: 240px;
        }
      `}</style>
    </>
  )
}
