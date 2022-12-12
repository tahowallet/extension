import { setNewDefaultWalletValue } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"
import SharedButton from "../../components/Shared/SharedButton"
import SharedIcon from "../../components/Shared/SharedIcon"
import SharedToggleButton from "../../components/Shared/SharedToggleButton"

export default function SwitchWalletPage({
  close,
}: {
  close: () => Promise<void>
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "dAppConnect.switchWallet",
  })
  const { t: tShared } = useTranslation("translation", { keyPrefix: "shared" })
  const dispatch = useDispatch()
  const [toggleState, setToggleState] = useState(false)

  const toggleDefaultWallet = useCallback(
    (defaultWalletValue: boolean) => {
      setToggleState(defaultWalletValue)
      dispatch(setNewDefaultWalletValue(defaultWalletValue))
    },
    [dispatch]
  )

  useEffect(() => {
    toggleDefaultWallet(false)
  }, [toggleDefaultWallet])

  return (
    <div className="page">
      <section className="standard_width">
        <h1 className="serif_header"> {t("title")}</h1>
        <p>
          {t("descFirstPart")}
          <span className="icon_wrap">
            <SharedIcon
              icon="icons/s/settings.svg"
              width={16}
              color="var(--green-40)"
            />
          </span>
          {t("descSecondPart")}
        </p>
        <div className="toggle_default">
          <span>{t("toggleTitle")}</span>
          <SharedToggleButton
            onChange={(value) => toggleDefaultWallet(value)}
            value={toggleState}
          />
        </div>
        <div className="button_wrap">
          <SharedButton type="primary" size="large" onClick={close}>
            {tShared("closeWindow")}
          </SharedButton>
        </div>
      </section>

      <style jsx>{`
        .page {
          background-color: var(--green-95);
          height: 100vh;
          width: 100vw;
          z-index: 1000;
          color: var(--green-20);
        }
        section {
          display: flex;
          flex-direction: column;
          height: 100vh;
          margin: 0 auto;
        }
        h1 {
          color: var(--trophy-gold);
          margin-top: 45px;
          margin-bottom: 25px;
          text-align: center;
        }
        p {
          text-align: center;
          font-size: 16px;
          line-height: 24px;
          font-weight: 500;
          width: 100%;
          margin: 0 0 37px;
          padding: 0 8px;
          box-sizing: border-box;
        }
        .toggle_default {
          background: var(--hunter-green);
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 8px;
          padding: 13px 16px;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          margin-bottom: 53px;
        }
        .button_wrap {
          display: flex;
          justify-content: center;
        }
        .icon_wrap {
          vertical-align: middle;
        }
      `}</style>
    </div>
  )
}
