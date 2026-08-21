import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"
import SharedIcon from "../Shared/SharedIcon"

type Props = {
  network: EVMNetwork
}

/**
 * Says out loud what the rest of the wallet view can only imply: the numbers
 * below are as good as they were the last time this network answered, and it
 * is not answering now.
 *
 * Named for one network rather than for connectivity in general because the
 * extension polls every subscribed chain, so one going dark says nothing about
 * the others — and a wallet claiming to be offline while three of its four
 * networks work would be its own kind of lie.
 */
export default function NetworkUnreachableBanner({
  network,
}: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "networkUnreachable.banner",
  })

  return (
    <div className="container">
      <SharedBanner style={{ width: "100%", boxSizing: "border-box" }}>
        <div className="content_container" role="alert">
          <SharedIcon
            icon="icons/m/notif-attention.svg"
            width={24}
            color="var(--attention)"
            style={{ flexShrink: 0 }}
          />
          <div className="content">
            <h1>{t("title", { network: network.name })}</h1>
            <span>{t("description")}</span>
            <SharedButton
              style={{ height: "auto", margin: "8px 0" }}
              size="medium"
              type="tertiary"
              linkTo={{
                pathname: "/settings/custom-networks",
                state: { editChainID: network.chainID },
              }}
              iconSmall="settings"
              iconPosition="left"
            >
              {t("settingsLink")}
            </SharedButton>
          </div>
        </div>
      </SharedBanner>
      <style jsx>{`
        .container {
          margin: 0 8px 8px;
        }
        .content_container {
          display: flex;
          flex-direction: row;
          align-items: start;
        }
        .content {
          flex-direction: column;
          flex-grow: 1;
          margin: 0 8px;
        }
        h1 {
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-20);
          margin: 0 0 8px;
        }
        span {
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          color: var(--green-40);
        }
      `}</style>
    </div>
  )
}
