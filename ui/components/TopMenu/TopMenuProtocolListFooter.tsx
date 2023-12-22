import React from "react"

import { useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"

export default function TopMenuProtocolListFooter(): JSX.Element {
  const history = useHistory()
  const { t } = useTranslation()

  return (
    <footer>
      <SharedButton
        size="medium"
        onClick={() => history.push("/settings/custom-networks")}
        type="tertiary"
      >
        <SharedIcon
          width={16}
          height={16}
          style={{ marginRight: 4 }}
          icon="icons/s/add.svg"
          color="currentColor"
        />
        {t("topMenu.protocolList.networkSettingsBtn")}
      </SharedButton>
      <style jsx>
        {`
          footer {
            background: var(--hunter-green);
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: auto;
            padding: 4px 24px;
          }

          footer ul {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
          }

          footer h2 {
            font-family: "Segment";
            font-style: normal;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
            color: var(--white);
            margin: 0;
          }

          footer p {
            margin: 0;
            font-family: "Segment";
            font-style: normal;
            font-weight: 500;
            font-size: 14px;
            line-height: 16px;
            line-height: 16px;
            letter-spacing: 0.03em;
            color: var(--green-40);
          }
        `}
      </style>
    </footer>
  )
}
