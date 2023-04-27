import { OneTimeAnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import { importSigner } from "@tallyho/tally-background/redux-slices/keyrings"
import { sendEvent } from "@tallyho/tally-background/redux-slices/ui"
import { SignerTypes } from "@tallyho/tally-background/services/keyring"
import { isHexString } from "ethers/lib/utils"
import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedSeedInput from "../../../components/Shared/SharedSeedInput"
import { useBackgroundDispatch } from "../../../hooks"

type Props = {
  setIsImporting: (value: boolean) => void
  finalize: () => void
}

function validatePrivateKey(privateKey = ""): boolean {
  try {
    const paddedKey = privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`
    // valid pk has 32 bytes -> 64 hex characters
    return (
      isHexString(paddedKey) && BigInt(paddedKey).toString(16).length === 64
    )
  } catch (e) {
    return false
  }
}

export default function ImportPrivateKey(props: Props): ReactElement {
  const { setIsImporting, finalize } = props

  const dispatch = useBackgroundDispatch()

  const [privateKey, setPrivateKey] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.importPrivateKey",
  })

  const onInputChange = useCallback((pk: string) => {
    setPrivateKey(pk)
    setErrorMessage("")
  }, [])

  const importWallet = useCallback(async () => {
    const trimmedPrivateKey = privateKey.toLowerCase().trim()
    if (validatePrivateKey(trimmedPrivateKey)) {
      setIsImporting(true)
      const { success } = (await dispatch(
        importSigner({
          type: SignerTypes.privateKey,
          privateKey: trimmedPrivateKey,
        })
      )) as unknown as AsyncThunkFulfillmentType<typeof importSigner>

      if (success) {
        dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
        finalize()
      } else {
        setIsImporting(false)
      }
    } else {
      setErrorMessage(t("error"))
    }
  }, [dispatch, privateKey, setIsImporting, finalize, t])

  return (
    <>
      <SharedSeedInput
        onChange={onInputChange}
        label={t("inputLabel")}
        errorMessage={errorMessage}
      />
      <SharedButton
        style={{ width: "100%", maxWidth: "320px", marginTop: "25px" }}
        size="medium"
        type="primary"
        isDisabled={!privateKey}
        onClick={importWallet}
        center
      >
        {t("submit")}
      </SharedButton>
      <style jsx>{`
        .bottom {
          width: 100%;
          margin: 25px auto 0;
        }
      `}</style>
    </>
  )
}
