import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"

function RegularWarning() {
  const { t } = useTranslation()
  return <span>{t("accounts.accountItem.regularWarning")}</span>
}
function LoudWarning() {
  const { t } = useTranslation()
  return (
    <span>
      <h3>{t("accounts.accountItem.loudWarningTitle")}</h3>
      {t("accounts.accountItem.loudWarningBody")}
    </span>
  )
}
function LastAccountWarning() {
  const { t } = useTranslation()
  return (
    <span>
      <h3>{t("accounts.accountItem.lastAccountWarningTitle")}</h3>
      {t("accounts.accountItem.lastAccountWarningBody")}
    </span>
  )
}
type RemoveAccountWarningProps = {
  lastAddressInAccount: boolean
  lastAccountInTallyWallet: boolean
  isReadOnlyAccount: boolean
}

export default function RemoveAccountWarning({
  lastAddressInAccount,
  lastAccountInTallyWallet,
  isReadOnlyAccount,
}: RemoveAccountWarningProps): ReactElement {
  if (lastAccountInTallyWallet) {
    return <LastAccountWarning />
  }

  if (lastAddressInAccount || isReadOnlyAccount) {
    return <LoudWarning />
  }

  return <RegularWarning />
}
