import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  NetworkFeeSettings,
  setFeeType,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import {
  selectDefaultNetworkFeeSettings,
  selectEstimatedFeesPerGas,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { SWAP_FEE } from "@tallyho/tally-background/redux-slices/0x-swap"
import { CUSTOM_GAS_SELECT } from "@tallyho/tally-background/features"
import { setSlippageTolerance } from "@tallyho/tally-background/redux-slices/ui"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import NetworkSettingsSelect from "../NetworkFees/NetworkSettingsSelect"
import FeeSettingsText from "../NetworkFees/FeeSettingsText"
import SharedSelect, { Option } from "../Shared/SharedSelect"

export type SwapTransactionSettings = {
  slippageTolerance: number
  networkSettings: NetworkFeeSettings
}

interface SwapTransactionSettingsProps {
  isSettingsLocked?: boolean
  swapTransactionSettings: SwapTransactionSettings
  onSwapTransactionSettingsSave?: (setting: SwapTransactionSettings) => void
}

const slippageToleranceOptions: Option[] = [
  { value: "0.005", label: "0.5%" },
  { value: "0.01", label: "1%" },
  { value: "0.02", label: "2%" },
  { value: "0.04", label: "4%" },
]

export default function SwapTransactionSettingsChooser({
  isSettingsLocked,
  swapTransactionSettings,
  onSwapTransactionSettingsSave,
}: SwapTransactionSettingsProps): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const [networkSettings, setNetworkSettings] = useState(
    useBackgroundSelector(selectDefaultNetworkFeeSettings)
  )
  const [slippageTolerance, setLocalSlippage] = useState(
    swapTransactionSettings.slippageTolerance
  )
  const [isSlideUpMenuOpen, setIsSlideUpMenuOpen] = useState(false)

  const openSettings = () => {
    if (!isSettingsLocked) {
      setIsSlideUpMenuOpen(true)
    }
  }

  const onSlippageToleranceChange = (value: string) =>
    setLocalSlippage(parseFloat(value))

  const saveSettings = () => {
    dispatch(setFeeType(networkSettings.feeType))
    dispatch(setSlippageTolerance(slippageTolerance))

    onSwapTransactionSettingsSave?.({
      ...swapTransactionSettings,
      slippageTolerance,
      networkSettings,
    })

    setIsSlideUpMenuOpen(false)
  }

  return (
    <>
      {isSettingsLocked ? (
        <div className="top_label label">
          {t("swap.transactionSettings.title")}
        </div>
      ) : (
        <>
          <SharedSlideUpMenu
            isOpen={isSlideUpMenuOpen}
            size="large"
            close={() => {
              setIsSlideUpMenuOpen(false)
            }}
          >
            <div className="settings_wrap">
              <div className="row row_slippage">
                <span className="settings_label">
                  {t("swap.transactionSettings.slippageTolerance")}
                </span>
                <SharedSelect
                  width={94}
                  options={slippageToleranceOptions}
                  onChange={onSlippageToleranceChange}
                  defaultIndex={slippageToleranceOptions.findIndex(
                    ({ value }) =>
                      parseFloat(value) ===
                      swapTransactionSettings.slippageTolerance
                  )}
                />
              </div>
              <div className="row row_fee">
                <NetworkSettingsSelect
                  estimatedFeesPerGas={estimatedFeesPerGas}
                  networkSettings={swapTransactionSettings.networkSettings}
                  onNetworkSettingsChange={setNetworkSettings}
                  onSave={saveSettings}
                />
              </div>
            </div>
          </SharedSlideUpMenu>

          <div className="top_label label">
            <label htmlFor="open-settings">
              {t("swap.transactionSettings.settings")}
            </label>
            <button type="button" id="open-settings" onClick={openSettings}>
              <span className="icon_cog" />
            </button>
          </div>
        </>
      )}
      <div className="labels_wrap standard_width">
        <span className="label">
          {t("swap.transactionSettings.slippageTolerance")}
          <div className="info">
            {swapTransactionSettings.slippageTolerance * 100}%
          </div>
        </span>
        <span className="label">
          {t("swap.transactionSettings.estimatedFee")}
          <FeeSettingsText
            customNetworkSetting={swapTransactionSettings.networkSettings}
          />
        </span>
        <span className="label">
          {t("swap.transactionSettings.daoFee")}
          <div className="info">{SWAP_FEE * 100}%</div>
        </span>
      </div>
      <style jsx>
        {`
          .confirm {
            width: 100%;
            display: flex;
            justify-content: flex-end;
            position: fixed;
            bottom: 13px;
            left: 0px;
          }
          .labels_wrap {
            border-radius: 4px;
            background-color: var(--green-95);
            padding: 16px;
            box-sizing: border-box;
          }
          .top_label {
            margin-bottom: 7px;
          }
          .top_label label {
            flex-grow: 2;
          }
          .row {
            padding: ${CUSTOM_GAS_SELECT ? "unset" : "15px 0px"};
            display: flex;
            align-items: center;
          }
          .row_slippage {
            display: flex;
            justify-content: space-between;
            padding-bottom: 38px;
          }
          .row_fee {
            flex-direction: column;
            align-items: flex-start;
          }
          .settings_label {
            color: var(--green-5);
            font-size: 14px;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
          }
          .network_fee_label {
            margin-top: 26px;
            display: block;
            margin-bottom: 10px;
          }
          .settings_label_fee {
            margin-bottom: 7px;
          }
          .icon_cog {
            display: block;
            mask-image: url("./images/cog@2x.png");
            mask-size: cover;
            width: 12px;
            height: 12px;
            background-color: var(--green-60);
          }
          .icon_cog:hover {
            background-color: #fff;
          }
          .settings_wrap {
            width: 384px;
            padding: 0px 17px;
            height: 100vh;
            padding-top: 58px;
            box-sizing: border-box;
            background-color: var(--green-95);
            margin-top: -23px;
          }
          .label:first-of-type {
            margin-bottom: 7px;
          }
          .info {
            color: var(--green-20);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            text-align: right;
          }
          .label {
            margin-bottom: 5px;
          }
        `}
      </style>
    </>
  )
}
