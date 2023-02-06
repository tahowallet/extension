import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import React, { ReactElement } from "react"
import { Trans, useTranslation } from "react-i18next"
import SharedButton from "../../components/Shared/SharedButton"
import SharedLink from "../../components/Shared/SharedLink"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"

const CHAIN_LIST = {
  name: "ChainList",
  url: "https://chainlist.org/",
}

export default function SettingsCustomNetworks(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "settings.customNetworksSettings",
  })

  return (
    <div className="standard_width_padded wrapper">
      <SharedPageHeader withoutBackText backPath="/settings">
        {t(`title`)}
      </SharedPageHeader>
      <section className="content">
        <div className="chain_list_wrap">
          <div className="icon" />
          <span className="simple_text">
            <Trans
              t={t}
              i18nKey="chainList.description"
              components={{
                url: <SharedLink text={CHAIN_LIST.name} url={CHAIN_LIST.url} />,
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
        {isEnabled(FeatureFlags.SUPPORT_CUSTOM_RPCS) && (
          <div className="custom_rpc_wrap">
            <span className="simple_text">{t(`customRPC.description`)}</span>
            <SharedButton type="tertiary" size="medium" iconSmall="new-tab">
              {t(`customRPC.addBtn`)}
            </SharedButton>
          </div>
        )}
      </section>
      <style jsx>{`
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 50px;
        }
        .content {
          padding: 0 24px;
          display: flex;
          flex-direction: column;
          gap: 50px;
        }
        .chain_list_wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .icon {
          background: url("./images/chain_list.svg") center no-repeat;
          width: 132px;
          height: 32px;
        }
        .custom_rpc_wrap {
          padding-top: 28px;
          border-top: 1px solid var(--green-95);
          width: 100%;
        }
      `}</style>
    </div>
  )
}
