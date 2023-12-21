import React, { Dispatch, SetStateAction, useCallback } from "react"
import { KeyPrefix, useTranslation } from "react-i18next"
import SharedTooltip from "./SharedTooltip"
import SharedIcon from "./SharedIcon"

type SharedFilterTooltipProps = {
  keyPrefix: KeyPrefix<"translation">
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export default function SharedFilterTooltip({
  keyPrefix,
  isOpen,
  setIsOpen,
}: SharedFilterTooltipProps) {
  const { t } = useTranslation("translation", {
    keyPrefix,
  })

  const handleToggleClick = useCallback(() => {
    setIsOpen((currentlyOpen) => !currentlyOpen)
  }, [setIsOpen])

  return (
    <>
      <div className="filters_container">
        <SharedTooltip
          width={36}
          height={32}
          verticalPosition="bottom"
          horizontalPosition="center"
          horizontalShift={8}
          type="dark"
          isOpen={isOpen}
          IconComponent={() => (
            <SharedIcon
              width={24}
              icon="toggle.svg"
              ariaLabel={t("filters.title")}
              color="var(--green-40)"
              hoverColor="var(--green-20)"
              onClick={handleToggleClick}
            />
          )}
        >
          {t("filters.tooltip")}
        </SharedTooltip>
      </div>
      <style jsx>{`
        .filters_container {
          position: absolute;
          width: 90vw;
          display: flex;
          justify-content: end;
        }
      `}</style>
    </>
  )
}
