import React, { useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import SharedLink from "../components/Shared/SharedLink"
import { CHAIN_LIST } from "../utils/constants"
import SharedInput from "../components/Shared/SharedInput"
import SharedToggleButton from "../components/Shared/SharedToggleButton"
import SharedButton from "../components/Shared/SharedButton"
import SharedNetworkIcon from "../components/Shared/SharedNetworkIcon"

function NewCustomNetworkSuccess({ network }: { network: EVMNetwork }) {
  const { t } = useTranslation("translation", {
    keyPrefix: "customNetworksTab.success",
  })

  return (
    <section>
      <div className="bg">
        <div className="fadeIn">
          <header>
            <img
              width="80"
              height="80"
              alt="Taho Gold"
              src="./images/doggo_gold.svg"
            />
            <h1 className="title">{t("title")}</h1>
            <p className="subtitle">{t("subtitle")}</p>
          </header>
          <div className="custom_network_preview">
            <SharedNetworkIcon size={42} network={network} />
            <div className="right">
              {/* TODO: Handle long strings */}
              <span className="name">{network.name}</span>
              <span className="description">custom network</span>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .custom_network_preview .right {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .custom_network_preview .name {
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
          color: var(--white);
        }
        .custom_network_preview .description {
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;

          color: var(--green-40);
        }
        .custom_network_preview {
          display: flex;
          gap: 12px;
          margin: 0 auto;
          justify-content: center;
        }
        section {
          width: 100%;
          display: flex;
          height: 100%;
          width: 100%;
          justify-content: center;
        }

        .bg {
          position: relative;
          padding: 62px 80px 0;
          width: 50%;
          height: 100%;
          box-sizing: border-box;
          background: #04141480;
          overflow-y: hidden;
        }

        header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
        }

        .title {
          margin: 0;
          font-family: Quincy CF;
          font-size: 36px;
          font-weight: 500;
          line-height: 42px;
          letter-spacing: 0em;
          text-align: center;
          color: var(--white);
        }

        .subtitle {
          margin: 0;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
          color: var(--green-40);
        }
      `}</style>
    </section>
  )
}

export default function NewCustomNetworkTab(): JSX.Element {
  const { t } = useTranslation("translation", {
    keyPrefix: "customNetworksTab.form",
  })

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = () => {}

  const [submitSuccess] = useState(false)

  if (submitSuccess) {
    return (
      <NewCustomNetworkSuccess
        // TODO: Vlad's chain doesn't exist
        network={
          { chainID: "777", name: "Vlad's Chain" } as unknown as EVMNetwork
        }
      />
    )
  }

  return (
    <section>
      <div className="bg">
        <div className="fadeIn">
          <header>
            <img
              width="80"
              height="80"
              alt="Taho Gold"
              src="./images/doggo_gold.svg"
            />
            <h1 className="title">{t("title")}</h1>
            <p className="subtitle">
              <Trans
                t={t}
                i18nKey="subtitle"
                components={{
                  url: (
                    <SharedLink text={CHAIN_LIST.name} url={CHAIN_LIST.url} />
                  ),
                }}
              />
            </p>
          </header>
          <form onSubmit={handleSubmit}>
            <div className="row">
              <SharedInput label={t("input.networkName")} />
            </div>
            <div className="row">
              <SharedInput label={t("input.rpc")} />
            </div>
            <div className="row">
              <SharedInput label={t("input.chainID")} />
            </div>
            <div className="row">
              <SharedInput label={t("input.symbol")} />
            </div>
            <div className="row">
              <SharedInput label={t("input.blockExplorer")} />
            </div>
            <div className="row">
              <SharedInput label={t("input.logoURL")} />
            </div>
            <div className="row testnet_toggler">
              {t("input.isTestnet")}
              <SharedToggleButton
                onChange={() => {
                  /* TODO */
                }}
              />
            </div>
            <div>
              <SharedButton
                style={{ width: "100%", boxSizing: "border-box" }}
                size="medium"
                type="primary"
                onClick={() => {
                  /* TODO */
                }}
                isDisabled
                center
                isFormSubmit
              >
                {t("submit")}
              </SharedButton>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        section {
          width: 100%;
          display: flex;
          height: 100%;
          width: 100%;
          justify-content: center;
        }

        .bg {
          position: relative;
          padding: 62px 80px 0;
          width: 50%;
          height: 100%;
          box-sizing: border-box;
          background: #04141480;
          overflow-y: hidden;
        }

        header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
        }

        .title {
          margin: 0;
          font-family: Quincy CF;
          font-size: 36px;
          font-weight: 500;
          line-height: 42px;
          letter-spacing: 0em;
          text-align: center;
          color: var(--white);
        }

        .subtitle {
          margin: 0;
          font-size: 16px;
          font-weight: 400;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
          color: var(--green-40);
        }

        form {
          all: unset;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 324px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        .testnet_toggler {
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          font-size: 16px;
          line-height: 24px;
          letter-spacing: 0.03em;
          color: var(--white);
        }
      `}</style>
    </section>
  )
}
