import { TEST_NETWORK_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import {
  isProbablyEVMAddress,
  normalizeEVMAddress,
} from "@tallyho/tally-background/lib/utils"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  checkTokenContractDetails,
  importCustomToken,
} from "@tallyho/tally-background/redux-slices/assets"
import {
  selectCurrentNetwork,
  userValueDustThreshold,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectEVMNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import {
  selectHideDust,
  selectShowTestNetworks,
  setSnackbarMessage,
} from "@tallyho/tally-background/redux-slices/ui"
import { AsyncThunkFulfillmentType } from "@tallyho/tally-background/redux-slices/utils"
import { HexString } from "@tallyho/tally-background/types"
import React, { FormEventHandler, ReactElement, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useHistory } from "react-router-dom"
import SharedAssetIcon from "../../components/Shared/SharedAssetIcon"
import SharedButton from "../../components/Shared/SharedButton"
import SharedIcon from "../../components/Shared/SharedIcon"
import SharedInput from "../../components/Shared/SharedInput"
import SharedLink from "../../components/Shared/SharedLink"
import SharedNetworkIcon from "../../components/Shared/SharedNetworkIcon"
import SharedPageHeader from "../../components/Shared/SharedPageHeader"
import SharedSlideUpMenu from "../../components/Shared/SharedSlideUpMenu"
import SharedTooltip from "../../components/Shared/SharedTooltip"
import { productionNetworkInfo } from "../../components/TopMenu/TopMenuProtocolList"
import TopMenuProtocolListItem from "../../components/TopMenu/TopMenuProtocolListItem"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import { useSetState } from "../../hooks/react-hooks"
import { trimWithEllipsis } from "../../utils/textUtils"

const HELPDESK_CUSTOM_TOKENS_LINK =
  "https://tahowallet.notion.site/Adding-Custom-Tokens-2facd9b82b5f4685a7d4766caeb05a4c"
const MAX_SYMBOL_LENGTH = 10

const PlaceholderIcon = () => (
  <div>
    <i />
    <style jsx>{`
      i {
        mask-image: url("/images/placeholder.svg");
        mask-size: cover;
        display: block;
        width: 24px;
        height: 24px;
        background-color: var(--green-20);
      }
      div {
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--green-60);
        width: 40px;
        color: var(--green-20);
      }
    `}</style>
  </div>
)

export default function SettingsAddCustomAsset(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "settings.addCustomAssetSettings",
  })
  const { t: sharedT } = useTranslation("translation")

  const history = useHistory()

  type AssetData = AsyncThunkFulfillmentType<typeof checkTokenContractDetails>

  const [{ loading, error, assetData }, setState] = useSetState<{
    loading: boolean
    error: boolean
    assetData: AssetData | null
  }>({
    loading: false,
    error: false,
    assetData: null,
  })

  const [tokenAddress, setTokenAddress] = useState("")

  const dispatch = useBackgroundDispatch()
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)
  const allNetworks = useBackgroundSelector(selectEVMNetworks)
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)

  const networks = allNetworks.filter(
    (network) =>
      !TEST_NETWORK_BY_CHAIN_ID.has(network.chainID) ||
      (showTestNetworks && TEST_NETWORK_BY_CHAIN_ID.has(network.chainID))
  )

  const [chosenNetwork, setChosenNetwork] = useState<EVMNetwork>(currentNetwork)
  const [isNetworkSelectOpen, setNetworkSelectOpen] = useState(false)
  const [isImportingToken, setIsImportingToken] = useState(false)

  const requestIdRef = useRef(0)

  const handleTokenInfoChange = async (
    addressLike: HexString,
    network: EVMNetwork
  ) => {
    requestIdRef.current += 1
    const callId = requestIdRef.current

    const contractAddress = addressLike.trim()

    if (contractAddress.length < 1) {
      setState({ loading: false, assetData: null, error: false })
      return
    }

    if (!isProbablyEVMAddress(contractAddress)) {
      setState({ loading: false, assetData: null, error: true })
      return
    }

    const details = (await dispatch(
      checkTokenContractDetails({
        contractAddress: normalizeEVMAddress(contractAddress),
        network,
      })
    )) as unknown as AssetData

    // async setState safeguard
    if (requestIdRef.current === callId) {
      setState({ loading: false, assetData: details, error: details === null })
    }
  }

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()

    if (!assetData) {
      return
    }

    try {
      setIsImportingToken(true)
      await dispatch(importCustomToken({ asset: assetData.asset }))
      await dispatch(setSnackbarMessage(t("snackbar.success")))
    } finally {
      setIsImportingToken(false)
      history.push("/")
    }
  }

  const hideDustEnabled = useBackgroundSelector(selectHideDust)
  const showWarningAboutDust =
    hideDustEnabled &&
    assetData?.mainCurrencyAmount !== undefined &&
    assetData?.mainCurrencyAmount < userValueDustThreshold

  return (
    <div className="standard_width_padded wrapper">
      <SharedPageHeader withoutBackText>{t(`title`)}</SharedPageHeader>
      <style jsx>{`
        .tooltip_wrap {
          position: absolute;
          top: 16px;
          right: 16px;
        }

        .input_container {
          position: relative;
          --input-padding: 0 32px 0 16px;
        }

        .network_select ul {
          overflow-y: auto;
          max-height: 460px;
        }

        .network_select {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 0 16px;
        }

        .network_select_title {
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: left;
        }
      `}</style>
      <SharedSlideUpMenu
        isOpen={isNetworkSelectOpen}
        isScrollable
        customStyles={{ display: "flex", flexDirection: "column" }}
        close={() => setNetworkSelectOpen(false)}
      >
        <div className="network_select">
          <div className="network_select_title">{t("networkSelect.title")}</div>
          <ul>
            {networks.map((network) => (
              <TopMenuProtocolListItem
                key={network.chainID}
                network={network}
                isSelected={chosenNetwork.chainID === network.chainID}
                onSelect={(selectedNetwork) => {
                  setChosenNetwork(selectedNetwork)
                  setNetworkSelectOpen(false)
                  handleTokenInfoChange(tokenAddress, selectedNetwork)
                }}
                showSelectedText={false}
                info={
                  productionNetworkInfo[network.chainID] ||
                  sharedT("protocol.compatibleChain")
                }
              />
            ))}
          </ul>
        </div>
      </SharedSlideUpMenu>
      <style jsx>{`
        .network_select_input:hover {
          --icon-color: var(--green-5);
        }

        .network_select_input {
          border: 2px solid var(--green-60);
          border-radius: 4px;
          display: flex;
          padding: 8px 16px;
          gap: 8px;
          align-items: center;
          cursor: pointer;
        }
      `}</style>
      <form onSubmit={handleFormSubmit}>
        <div
          role="button"
          onClick={() => setNetworkSelectOpen(true)}
          onKeyUp={() => setNetworkSelectOpen(true)}
          className="network_select_input"
          tabIndex={-1}
        >
          <SharedNetworkIcon network={chosenNetwork} size={16} />
          <span>{chosenNetwork.name}</span>
          <SharedIcon
            width={16}
            height={8}
            icon="chevron_down.svg"
            color="var(--icon-color, var(--white))"
            customStyles="margin-left: auto"
          />
        </div>
        <div className="input_container">
          <SharedInput
            label={t("input.contractAddress.label")}
            errorMessage={error ? t("error.invalidToken") : ""}
            onChange={(addressLike) => {
              setTokenAddress(addressLike)
              handleTokenInfoChange(addressLike, chosenNetwork)
            }}
          />
          <div className="tooltip_wrap">
            <SharedTooltip
              width={219}
              horizontalShift={100}
              customStyles={{ "--tooltip-icon-color": "var(--green-20)" }}
            >
              <Trans
                t={t}
                i18nKey="input.tooltip"
                components={{
                  url: (
                    <SharedLink
                      styles={{
                        textDecoration: "underline",
                        "--link-color": "var(--green-95)",
                        "--hover-color": "var(--green-40)",
                      }}
                      type="button"
                      url={HELPDESK_CUSTOM_TOKENS_LINK}
                    />
                  ),
                }}
              />
            </SharedTooltip>
          </div>
        </div>
        <div className="form_controls">
          <div className="token_details_container">
            {assetData && !loading ? (
              <SharedAssetIcon
                size={40}
                logoURL={assetData?.asset.metadata?.logoURL}
                symbol={assetData.asset.symbol}
              />
            ) : (
              <PlaceholderIcon />
            )}
            <div className="token_details">
              <div className="balance">
                <strong title={String(assetData?.balance)}>
                  {assetData?.balance ?? t("asset.label.balance")}
                </strong>
                <span className="symbol">
                  {assetData?.asset?.symbol
                    ? trimWithEllipsis(
                        assetData.asset.symbol,
                        MAX_SYMBOL_LENGTH
                      )
                    : t("asset.label.symbol")}
                </span>
              </div>
              <span className="network_name">{chosenNetwork.name}</span>
            </div>
          </div>
          <SharedButton
            type="primary"
            size="medium"
            isFormSubmit
            isDisabled={
              !assetData ||
              loading ||
              error ||
              assetData.exists ||
              isImportingToken
            }
            isLoading={loading || isImportingToken}
          >
            {t("submit")}
          </SharedButton>
        </div>
        {assetData?.exists ? (
          <div className="alert">
            <SharedIcon
              color="var(--success)"
              width={24}
              customStyles="min-width: 24px;"
              icon="icons/m/notif-correct.svg"
            />
            <div className="alert_content">
              <div className="title">{t("warning.alreadyExists.title")}</div>
              <div className="desc">{t("warning.alreadyExists.desc")}</div>
            </div>
          </div>
        ) : (
          <>
            {showWarningAboutDust && (
              <div className="alert">
                <SharedIcon
                  color="var(--attention)"
                  width={24}
                  customStyles="min-width: 24px;"
                  icon="icons/m/notif-attention.svg"
                />
                <div className="alert_content">
                  <div className="title" style={{ color: "var(--attention)" }}>
                    {t("warning.dust.title")}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </form>
      <style jsx>{`
        .alert {
          background: var(--green-120);
          border-radius: 8px;
          padding: 8px;
          display: flex;
          gap: 8px;
        }

        .alert .title {
          color: var(--success);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: left;
        }

        .alert .desc {
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: left;
          color: var(--green-40);
        }
      `}</style>
      <footer>
        <SharedLink
          text={t("footer.hint")}
          url={HELPDESK_CUSTOM_TOKENS_LINK}
          styles={{ "--link-color": "var(--green-40)" }}
        />
      </footer>
      <style jsx>{`
        form {
          all: unset;
          max-width: 100%;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        .form_controls {
          display: flex;
          justify-content: space-between;
        }

        .network_name {
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.03em;
          text-align: left;
          color: var(--green-40);
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
          white-space: pre;
      }
        }

        .token_details_container {
          display: flex;
          gap: 16px;
        }

        .token_details {
          display: flex;
          flex-direction: column;
        }

        .balance {
          display: flex;
          gap: 4px;
          align-items: baseline;
        }

        .balance strong {
          font-style: normal;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          color: var(--white);
          text-overflow: ellipsis;
          overflow-x: hidden;
          white-space: pre;
          max-width: 100px;
        }

        .symbol {
          font-style: normal;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
        }

        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 32px;
          height: 100%;
          margin-bottom: 24px;
        }

        footer {
          margin-top: auto;
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }

        .content {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
      `}</style>
    </div>
  )
}
