import React, { ReactElement } from "react"
import dayjs from "dayjs"
import SharedButton from "../../components/Shared/SharedButton"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"

export default function MenuExportLogs(): ReactElement {
  const base64LogContent = Buffer.from(
    `${window.navigator.userAgent}\n\n\n${localStorage.getItem("logs")}` || ""
  ).toString("base64")

  const logFileName = `logs_v${(process.env.VERSION || "").replace(
    /\./g,
    "_"
  )}__${dayjs().format()}.txt`

  return (
    <div className="standard_width_padded">
      <SharedPageHeader>Bug report</SharedPageHeader>
      <section>
        <h2>1. Join #bug-reports on Discord</h2>
        <p>
          Visit us on our Discord channel, and report your bug there, make sure
          to include the logs.
        </p>
        <SharedButton
          type="secondary"
          size="medium"
          iconSmall="discord"
          iconPosition="left"
          onClick={() => {
            window.open(`https://chat.tally.cash/`, "_blank")?.focus()
          }}
        >
          Join Discord
        </SharedButton>
      </section>
      <section>
        <h2>2. Export logs</h2>
        <p>
          In order for us to better understand your bug we need you to export
          your logs
        </p>
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
            Export logs
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
