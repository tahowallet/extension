import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { exportPrivateKey } from "@tallyho/tally-background/redux-slices/keyrings"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"
import SharedWarningMessage from "../Shared/SharedWarningMessage"
import SharedButton from "../Shared/SharedButton"
import SharedCheckbox from "../Shared/SharedCheckbox"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import SharedSecretText from "../Shared/SharedSecretText"
import { useBackgroundDispatch } from "../../hooks"

interface ShowPrivateKeyProps {
  account: AccountTotal
}

export default function ShowPrivateKey({
  account,
}: ShowPrivateKeyProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem.showPrivateKey",
  })
  const dispatch = useBackgroundDispatch()

  const [privateKey, setPrivateKey] = useState("")
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  useEffect(() => {
    const fetchPrivateKey = async () => {
      const key = (await dispatch(
        exportPrivateKey(account.address)
      )) as unknown as string | null

      if (key) {
        setPrivateKey(key)
      }
    }

    fetchPrivateKey()
  }, [dispatch, account.address])

  return (
    <>
      <SharedSlideUpMenuPanel header={t("header")} icon="icons/s/key.svg">
        <div className="content simple_text">
          <SharedWarningMessage text={t("warningMessage")} />
          <div className="exporting_container">
            <span className="header">{t("exportingPrivateKey.header")}</span>
            <div className="account_container">
              <SharedAccountItemSummary accountTotal={account} />
            </div>
            {showPrivateKey ? (
              <>
                <SharedSecretText text={privateKey} label={t("privateKey")} />
                <SharedButton
                  type="tertiary"
                  size="small"
                  iconMedium="copy"
                  onClick={() => {
                    navigator.clipboard.writeText(privateKey)
                    dispatch(
                      setSnackbarMessage(t("exportingPrivateKey.copySuccess"))
                    )
                  }}
                  center
                >
                  {t("exportingPrivateKey.copyBtn")}
                </SharedButton>
              </>
            ) : (
              <div className="confirmation_container">
                {/* TODO Fix issue with Checkbox */}
                <SharedCheckbox
                  label={t("exportingPrivateKey.confirmationDesc")}
                  value={isConfirmed}
                  onChange={(value) => setIsConfirmed(value)}
                />
                <div>
                  <SharedButton
                    type="primary"
                    size="medium"
                    isDisabled={!isConfirmed}
                    onClick={() => setShowPrivateKey(true)}
                  >
                    {t("exportingPrivateKey.showBtn")}
                  </SharedButton>
                </div>
              </div>
            )}
          </div>
          <div>{t("privateKeyInfo")}</div>
        </div>
      </SharedSlideUpMenuPanel>
      <style jsx>
        {`
          .content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            padding: 0 24px;
          }
          .account_container {
            display: flex;
            width: 100%;
            border-bottom: 1px solid #183736;
            padding: 8px 0 24px;
          }
          .exporting_container {
            box-sizing: border-box;
            width: 100%;
            height: 334px;
            padding: 16px 24px 24px;
            background: var(--green-120);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
          }
          .confirmation_container {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            margin-top: 16px;
          }
        `}
      </style>
    </>
  )
}
