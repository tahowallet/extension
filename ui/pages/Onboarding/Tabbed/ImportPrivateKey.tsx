import { OneTimeAnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import { importSigner } from "@tallyho/tally-background/redux-slices/internal-signer"
import { sendEvent } from "@tallyho/tally-background/redux-slices/ui"
import { SignerSourceTypes } from "@tallyho/tally-background/services/internal-signer"
import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { validatePrivateKey } from "@tallyho/tally-background/utils/internal-signer"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedSeedInput from "../../../components/Shared/SharedSeedInput"
import { useBackgroundDispatch } from "../../../hooks"

type Props = {
  setIsImporting: (value: boolean) => void
  finalize: () => void
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
          type: SignerSourceTypes.privateKey,
          privateKey: trimmedPrivateKey,
        }),
      )) as unknown as AsyncThunkFulfillmentType<typeof importSigner>

      if (success) {
        dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
        finalize()
      } else {
        setIsImporting(false)
        setErrorMessage(t("errorImport"))
      }
    } else {
      setErrorMessage(t("errorFormat"))
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
