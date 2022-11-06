import React, { ReactElement, useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { fetchJson } from "@ethersproject/web"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import { useTranslation } from "react-i18next"
import { formatUnits } from "@ethersproject/units"
import SharedButton from "../../../Shared/SharedButton"

type StateChange = {
  type: string
  data: Record<string, any>
  asset: any
  summary: {
    text: string
  }
}

type Warning = {
  type: string
  severity: string
}

type RelevantAddress = {
  address: string
  ens?: {
    name: string
  }
}

type KoiSimulation = {
  stateChanges?: StateChange[]
  warnings?: Warning[]
  relevantAddresses?: RelevantAddress[]
  origin?: string
  gasUsed?: string
}

const chainIDToNetworkName = {
  1: "ethereum",
  10: "optimism",
  137: "polygon",
  42161: "arbitrum",
  592: "astar",
}

export default function SimulationPanel({
  transactionRequest,
}: {
  transactionRequest: EnrichedEVMTransactionRequest
}): ReactElement {
  const [simulation, setSimulation] = useState<KoiSimulation | undefined>()

  // fetch a simulation from the Koi API on component mount
  useEffect(() => {
    let active = true

    async function loadSimulation() {
      if (active) {
        const { from, to, input, value } = transactionRequest
        const simRequest = {
          tx: {
            from,
            to,
            data: input,
            value: formatUnits(value),
          },
        }
        // TODO handle unsupported networks
        const network =
          chainIDToNetworkName[
            Number(
              transactionRequest.chainID
            ) as keyof typeof chainIDToNetworkName
          ]
        setSimulation(
          (await fetchJson(
            {
              url: `https://trykoi.com/api/v1/${network}/tx/simulate`,
            },
            JSON.stringify(simRequest, undefined, 2)
          )) as KoiSimulation
        )
      }
    }

    loadSimulation()

    return () => {
      active = false
    }
  })

  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })
  const dispatch = useDispatch()

  const { input } = transactionRequest

  const copyData = () => {
    navigator.clipboard.writeText(input ?? "")
    dispatch(setSnackbarMessage(t("rawDataCopyMsg")))
  }

  return (
    <div className="raw_data_wrap standard_width_padded">
      <SharedButton
        type="tertiary"
        iconMedium="copy"
        size="medium"
        iconPosition="left"
        onClick={copyData}
      >
        {t("copyRawData")}
      </SharedButton>
      <div className="raw_data_text">
        {simulation ? JSON.stringify(simulation) : null}{" "}
      </div>
      <style jsx>{`
        .raw_data_wrap {
          margin-top: 15px;
        }
        .raw_data_text {
          margin: 5px 0;
          padding: 24px;
          border-radius: 4px;
          background-color: var(--hunter-green);
          color: var(--green-40);
          overflow-wrap: break-word;
        }
      `}</style>
    </div>
  )
}
