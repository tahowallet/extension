import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import browser from "webextension-polyfill"

export default function WalletShortcut(): JSX.Element {
  const [os, setOS] = useState("windows")
  const { t } = useTranslation("translation")

  // Fetch the OS using the extension API to decide what shortcut to show
  useEffect(() => {
    const controller = new AbortController()

    browser.runtime.getPlatformInfo().then((platformInfo) => {
      if (!controller.signal.aborted) {
        setOS(platformInfo.os)
      }
    })

    return () => controller.abort()
  }, [])

  // state for alt, t, and option key status
  const [tPressed, setTPressed] = useState(false)
  const [altPressed, setAltPressed] = useState(false)

  // add keydown/up listeners for our shortcut code
  useEffect(() => {
    function downListener(e: KeyboardEvent) {
      if (e.altKey || e.key === "Alt") {
        setAltPressed(true)
      }
      if (e.key === "t") {
        setTPressed(true)
      }
    }

    function upListener(e: KeyboardEvent) {
      if (e.altKey || e.key === "Alt") {
        setAltPressed(false)
      }
      if (e.key === "t") {
        setTPressed(false)
      }
    }

    window.addEventListener("keydown", downListener)
    window.addEventListener("keyup", upListener)

    return () => {
      window.removeEventListener("keydown", downListener)
      window.removeEventListener("keyup", upListener)
    }
  })
  return (
    <div className="wallet_shortcut">
      <span>{t("onboarding.tabbed.walletShortcut")}</span>
      <img
        height="38"
        className="indicator"
        src={
          os === "mac"
            ? `/images/mac-shortcut${altPressed ? "-option" : ""}${
                tPressed ? "-t" : ""
              }.svg`
            : `/images/windows-shortcut${altPressed ? "-alt" : ""}${
                tPressed ? "-t" : ""
              }.svg`
        }
        alt={os === "mac" ? "option + T" : "alt + T"}
      />
      <style jsx>{`
        .wallet_shortcut {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }

        .wallet_shortcut > span {
          text-align: center;
        }
      `}</style>
    </div>
  )
}
