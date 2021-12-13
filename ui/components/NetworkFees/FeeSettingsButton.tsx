import { formatUnits } from "@ethersproject/units"
import {
  selectEstimatedFeesPerGas,
  selectSelectedNetworkFee,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import React, { ReactElement, useCallback, useState, useEffect } from "react"
import { useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import NetworkFeesChooser from "./NetworkFeesChooser"

interface FeeSettingsButtonProps {
  openModal: () => void
  closeModal: () => void
  open: boolean
}

export default function FeeSettingsButton({
  openModal,
  closeModal,
  open,
}: FeeSettingsButtonProps): ReactElement {
  const [minFee, setMinFee] = useState(0)
  const [maxFee, setMaxFee] = useState(0)
  const [currentFeeSelected, setCurrentFeeSelected] = useState("")

  const estimatedFeesPerGas = useBackgroundSelector(selectEstimatedFeesPerGas)
  const currentlySelectedNetworkFee = useBackgroundSelector(
    selectSelectedNetworkFee
  )
  const findMinMaxGas = useCallback(() => {
    if (
      estimatedFeesPerGas?.baseFeePerGas &&
      estimatedFeesPerGas?.regular?.maxPriorityFeePerGas &&
      estimatedFeesPerGas?.instant?.maxPriorityFeePerGas
    ) {
      setMinFee(
        Number(
          formatUnits(
            (estimatedFeesPerGas.baseFeePerGas * BigInt(11)) / 10n +
              estimatedFeesPerGas.regular?.maxPriorityFeePerGas,
            "gwei"
          ).split(".")[0]
        )
      )
      setMaxFee(
        Number(
          formatUnits(
            (estimatedFeesPerGas.baseFeePerGas * BigInt(18)) / 10n +
              estimatedFeesPerGas.instant?.maxPriorityFeePerGas,
            "gwei"
          ).split(".")[0]
        )
      )
    }
  }, [estimatedFeesPerGas])

  useEffect(() => {
    findMinMaxGas()
  }, [findMinMaxGas])

  return (
    <>
      <button
        className="settings"
        type="button"
        onClick={openModal}
        style={{
          background: `linear-gradient(90deg, var(--green-80) ${(
            ((Number(currentFeeSelected) || minFee) / maxFee) *
            100
          ).toFixed()}%, rgba(0, 0, 0, 0) ${(
            ((Number(currentFeeSelected) || minFee) / maxFee) *
            100
          ).toFixed()}%)`,
        }}
      >
        <div>
          ~{currentFeeSelected || minFee}
          Gwei
        </div>
        <img className="settings_image" src="./images/cog@2x.png" alt="" />
        <style jsx>
          {`
            .settings {
              height: 38px;
              display: flex;
              align-items: center;
              color: var(--gold-5);
              font-size: 16px;
              line-height: 24px;
              border-radius: 4px;
              padding-left: 8px;
              border: 1px solid #33514e;
            }
            .settings_image {
              width: 14px;
              height: 14px;
              padding: 0 8px;
            }
          `}
        </style>
      </button>
      <SharedSlideUpMenu
        size="custom"
        isOpen={open}
        close={closeModal}
        customSize={`${3 * 56 + 320}px`}
      >
        <NetworkFeesChooser
          closeModal={closeModal}
          currentFeeSelectionPrice={setCurrentFeeSelected}
          estimatedFeesPerGas={estimatedFeesPerGas}
          currentlyChosenFeeOption={currentlySelectedNetworkFee}
        />
      </SharedSlideUpMenu>
    </>
  )
}
