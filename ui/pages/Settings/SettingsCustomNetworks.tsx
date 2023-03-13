import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { removeCustomChain } from "@tallyho/tally-background/redux-slices/networks"
import { selectCustomNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import React, { ReactElement } from "react"
import { Trans, useTranslation } from "react-i18next"
import SharedButton from "../../components/Shared/SharedButton"
import SharedIcon from "../../components/Shared/SharedIcon"
import SharedLink from "../../components/Shared/SharedLink"
import SharedNetworkIcon from "../../components/Shared/SharedNetworkIcon"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import { intersperseWith } from "../../utils/lists"

const CHAIN_LIST = {
  name: "ChainList",
  url: "https://chainlist.org/",
}

export default function SettingsCustomNetworks(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "settings.customNetworksSettings",
  })
  const dispatch = useBackgroundDispatch()

  const allCustomNetworks = useBackgroundSelector(selectCustomNetworks)

  const customNetworksListItems = intersperseWith(
    allCustomNetworks,
    () => "spacer" as const
  )

  return (
    <div className="standard_width_padded wrapper">
      <SharedPageHeader withoutBackText backPath="/settings">
        {t(`title`)}
      </SharedPageHeader>
      {customNetworksListItems.length > 0 && (
        <section className="content">
          <h2 className="subheader">{t("subtitleAdded")}</h2>
          <ul className="custom_networks_list">
            {customNetworksListItems.map((item, index) => {
              if (item === "spacer") {
                return (
                  <li
                    role="presentation"
                    key={`spacer-${index.toString()}`}
                    className="spacer"
                  />
                )
              }

              return (
                <li className="custom_network_item" key={item.chainID}>
                  <SharedNetworkIcon size={42} network={item} />
                  <div className="network_label">
                    <span className="network_name" title={item.name}>
                      {item.name}
                    </span>
                    <span className="network_type">
                      {t("networksList.typeCustom")}
                    </span>
                  </div>
                  <div className="actions">
                    <SharedIcon
                      width={16}
                      onClick={() => dispatch(removeCustomChain(item.chainID))}
                      icon="icons/s/garbage.svg"
                      color="var(--green-40)"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <section className="content">
        <h2 className="subheader">{t("subtitleAddMore")}</h2>
        <div className="chain_add_options">
          <div className="chain_list_wrap">
            <div className="icon" />
            <span className="simple_text">
              <Trans
                t={t}
                i18nKey="chainList.description"
                components={{
                  url: (
                    <SharedLink text={CHAIN_LIST.name} url={CHAIN_LIST.url} />
                  ),
                }}
              />
            </span>
            <div>
              <SharedButton
                type="primary"
                size="medium"
                iconSmall="new-tab"
                style={{ marginTop: "24px" }}
                onClick={() => window.open(CHAIN_LIST.url, "_blank")?.focus()}
              >
                {t(`chainList.addBtn`)}
              </SharedButton>
            </div>
          </div>
          <hr className="separator" />
          {isEnabled(FeatureFlags.SUPPORT_CUSTOM_RPCS) && (
            <div className="custom_rpc_wrap">
              <span className="simple_text">{t(`customRPC.description`)}</span>
              <SharedButton type="tertiary" size="medium" iconSmall="new-tab">
                {t(`customRPC.addBtn`)}
              </SharedButton>
            </div>
          )}
        </div>
      </section>
      <style jsx>{`
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .spacer {
          width: 100%;
          border: 0.5px solid var(--green-120);
        }
        .subheader {
          font-family: Segment;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: left;
          color: var(--green-20);
          margin: 0;
        }

        .custom_networks_list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .custom_network_item .actions {
          margin-left: auto;
        }
        .custom_network_item {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .network_label {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .network_name {
          font-family: Segment;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
          color: var(--white);
          overflow-x: hidden;
          text-overflow: ellipsis;
          white-space: pre;
          max-width: 200px;
        }
        .network_type {
          font-family: Segment;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
          color: var(--green-40);
        }

        .content {
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chain_list_wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chain_add_options {
          gap: 32px;
        }

        .separator {
          border: none;
          border-top: 1px solid var(--green-95);
          margin: 32px 0;
        }

        .icon {
          background: url("./images/chain_list.svg") center no-repeat;
          width: 132px;
          height: 32px;
        }
        .custom_rpc_wrap {
          padding-bottom: 32px;
        }
      `}</style>
    </div>
  )
}
