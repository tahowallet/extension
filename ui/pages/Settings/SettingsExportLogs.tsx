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
      <SharedPageHeader withoutBackText>
        {t("settings.exportLogs.title")}
      </SharedPageHeader>
      <section>
        <h2>{t("settings.exportLogs.discordTitle")}</h2>
        <p className="simple_text">{t("settings.exportLogs.discordDesc")}</p>
        <SharedButton
          type="secondary"
          size="medium"
          iconSmall="discord"
          iconPosition="left"
          onClick={() => {
            window.open(`https://chat.tally.cash/`, "_blank")?.focus()
          }}
        >
          {t("settings.exportLogs.discordBtn")}
        </SharedButton>
      </section>
      <section>
        <h2>{t("settings.exportLogs.logTitle")}</h2>
        <p className="simple_text">{t("settings.exportLogs.logDesc")}</p>
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
            {t("settings.exportLogs.logBtn")}
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
        section {
          margin-bottom: 35px;
        }
      `}</style>
    </div>
  )
}
