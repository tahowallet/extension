import { selectCurrentAccountSigner } from "@tallyho/tally-background/redux-slices/selectors"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import classNames from "classnames"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundSelector } from "../../hooks"

export default function ReadOnlyNotice({
  isLite = false,
}: {
  isLite?: boolean
}): ReactElement {
  const { t } = useTranslation()
  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)

  if (currentAccountSigner !== ReadOnlyAccountSigner) return <></>

  return (
    <div
      className={classNames("notice_wrap", {
        is_lite: isLite,
      })}
    >
      <div className="icon_eye" />
      {isLite ? t("readOnly") : t("readOnlyNotice")}
      <style jsx>{`
        .notice_wrap {
          width: 177px;
          height: 40px;
          background: rgba(238, 178, 24, 0.1);
          border-radius: 2px;
          margin: 6px 0 10px;
          font-weight: 500;
          font-size: 16px;
          display: flex;
          align-items: center;
          border-left: solid 2px var(--attention);
        }
        .notice_wrap.is_lite {
          width: 120px;
          background: transparent;
          border: 0;
        }
        .icon_eye {
          background: url("./images/eye@2x.png");
          background-size: cover;
          width: 24px;
          height: 24px;
          margin: 0px 7px 0px 10px;
        }
      `}</style>
    </div>
  )
}
