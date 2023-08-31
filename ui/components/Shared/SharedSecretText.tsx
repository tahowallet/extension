import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedIcon from "./SharedIcon"

type Props = {
  text: string | ReactElement
  label?: string
  width?: string
  height?: string
}

export default function SharedSecretText(props: Props): ReactElement {
  const { text, label = "", width, height } = props
  const { t } = useTranslation()
  return (
    <>
      <div className="secret_container">
        <div className="secret_text centered">{text}</div>
        <div className="secret_blur centered">
          <SharedIcon
            icon="icons/m/eye-off.svg"
            width={24}
            color="var(--green-20)"
          />
          <span className="secret_label">{t("shared.mouseOverToShow")}</span>
          {label && <span className="secret_label">{label}</span>}
        </div>
      </div>
      <style jsx>{`
        .secret_container {
          width: ${width ?? "100%"};
          height: ${height ?? "100%"};
          position: relative;
          font-family: "Segment";
          font-style: normal;
          color: var(--green-20);
          text-align: center;
          cursor: pointer;
        }
        .secret_text {
          font-weight: 600;
          font-size: 18px;
          line-height: 27px;
          overflow-wrap: anywhere;
          padding: 10px;
          opacity: 0.8;
          filter: blur(6px);
        }
        .secret_blur {
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          opacity: 1;
        }
        .secret_container:hover .secret_blur {
          opacity: 0;
          pointer-events: none;
        }
        .secret_container:hover .secret_text {
          opacity: 1;
          filter: blur(0px);
        }
        .centered {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition:
            opacity 200ms ease-in-out,
            filter 200ms ease-in-out;
        }
      `}</style>
    </>
  )
}
