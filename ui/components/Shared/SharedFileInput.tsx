import React, { ReactElement, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"

type Props = {
  onFileLoad: (fileReader: FileReader | null) => void
  disabled?: boolean
  fileTypeLabel: string
  style?: React.CSSProperties
}

export default function SharedFileInput(props: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.importPrivateKey",
  })
  const { onFileLoad, disabled = false, fileTypeLabel, style } = props
  const handleChange = useCallback(
    (event) => {
      const fileReader = new FileReader()
      fileReader.readAsText(event.target.files[0], "UTF-8")
      fileReader.onload = (e) => {
        onFileLoad(e.target)
      }
    },
    [onFileLoad]
  )

  return (
    <>
      <div className="file_drop" style={style}>
        <div className="file_img" />
        <div className="file_text simple_text">
          <Trans
            t={t}
            i18nKey="browseFiles"
            values={{
              type: fileTypeLabel,
            }}
            components={{ span: <span /> }}
          />
        </div>
        <input type="file" onChange={handleChange} disabled={disabled} />
      </div>
      <style jsx>
        {`
          .file_drop {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            width: 100%;
            background: var(--green-120);
            border: 1px dashed var(--green-60);
            border-radius: 8px;
            padding: 16px 0 14px;
          }
          .file_drop input {
            cursor: pointer;
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            right: 0;
            opacity: 0;
          }
          .file_img {
            background: url("./images/json_file.svg");
            background-size: cover;
            width: 46px;
            height: 62px;
            margin-bottom: 12px;
          }
          .file_text {
            width: 220px;
            text-align: center;
            color: var(--green-20);
          }
          .file_text span {
            color: var(--trophy-gold);
          }
        `}
      </style>
    </>
  )
}
