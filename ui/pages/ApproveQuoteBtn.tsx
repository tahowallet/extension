import React from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../components/Shared/SharedButton"

export default function ApproveQuoteBtn({
  isApprovalInProgress,
  isDisabled,
  onApproveClick,
  loading,
}: {
  isApprovalInProgress: boolean
  onApproveClick(): void
  loading: boolean
  isDisabled: boolean
}): React.ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "swap" })

  return isApprovalInProgress ? (
    <SharedButton type="primary" size="large" isDisabled>
      {t("waitingForApproval")}
    </SharedButton>
  ) : (
    <SharedButton
      type="primary"
      size="large"
      isDisabled={isDisabled}
      onClick={onApproveClick}
      isLoading={loading}
    >
      {t("approveAsset")}
    </SharedButton>
  )
}
