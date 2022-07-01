import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import dayjs from "dayjs"
import SharedButton from "../../components/Shared/SharedButton"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"

export default function SettingsExportLogs(): ReactElement {
  const { t } = useTranslation()
  const base64LogContent = Buffer.from(
    `${window.navigator.userAgent}\n\n\n${localStorage.getItem("logs")}` || ""
  ).toString("base64")

  const logFileName = `logs_v${(process.env.VERSION || "").replace(
    /\./g,
    "_"
  )}__${dayjs().format()}.txt`

  return (
    <div className="standard_width_padded">
      <SharedPageHeader>{t("settingsExportTitle")}</SharedPageHeader>
      <section>
        <h2>{t("settingsExportOptionDiscordTitle")}</h2>
        <p>{t("settingsExportOptionDiscordDesc")}</p>
        <SharedButton
          type="secondary"
          size="medium"
          iconSmall="discord"
          iconPosition="left"
          onClick={() => {
            window.open(`https://chat.tally.cash/`, "_blank")?.focus()
          }}
        >
          {t("settingsExportOptionDiscordBtn")}
        </SharedButton>
      </section>
      <section>
        <h2>{t("settingsExportOptionLogTitle")}</h2>
        <p>{t("settingsExportOptionLogDesc")}</p>
        <a
          href={`data:application/octet-stream;charset=utf-16le;base64,${base64LogContent}`}
          download={logFileName}
        >
          <SharedButton
            type="secondary"
            size="medium"
            iconSmall="download"
            iconPosition="left"
          >
            {t("settingsExportOptionLogBtn")}
          </SharedButton>
        </a>
      </section>
      <style jsx>{`
        h2 {
          color: var(--green-20);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          margin-top: 20px;
        }
        p {
          color: var(--green-40);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
        }
        section {
          margin-bottom: 35px;
        }
      `}</style>
    </div>
  )
}
