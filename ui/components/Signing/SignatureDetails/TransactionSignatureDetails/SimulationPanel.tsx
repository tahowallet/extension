import React, { ReactElement, useEffect, useState } from "react"
import { fetchJson } from "@ethersproject/web"
import { EnrichedEVMTransactionRequest } from "@tallyho/tally-background/services/enrichment"
import logger from "@tallyho/tally-background/lib/logger"
import { formatUnits } from "@ethersproject/units"
import SharedAddress from "../../../Shared/SharedAddress"

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

function StateChangeRow(
  stateChange: StateChange,
  index: number,
  relevantAddresses: RelevantAddress[]
): ReactElement {
  const {
    summary: { text },
  } = stateChange
  const addresses = relevantAddresses.reduce<Record<string, RelevantAddress>>(
    (acc, addressInfo) => {
      return {
        [addressInfo.address]: addressInfo,
        ...acc,
      }
    },
    {}
  )
  const splitSummary = text.split(/(0x[a-fA-F0-9]*)/g)
  return (
    <li key={index}>
      <p>
        {splitSummary.map((s) => {
          const name = addresses[s]?.ens?.name
          if (s.match(/^0x[0-9a-fA-F]*$/)) {
            return <SharedAddress address={s.trim()} name={name} />
          }
          return <span>{s}</span>
        })}
      </p>
    </li>
  )
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
        try {
          setSimulation(
            (await fetchJson(
              {
                url: `https://trykoi.com/api/v1/${network}/tx/simulate`,
              },
              JSON.stringify(simRequest)
            )) as KoiSimulation
          )
        } catch {
          logger.error("Error simulating transaction")
        }
      }
    }

    loadSimulation()

    return () => {
      active = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="raw_data_wrap standard_width_padded">
      <ul className="raw_data_text">
        {simulation &&
          simulation.stateChanges &&
          simulation.stateChanges.map((sc, i) =>
            StateChangeRow(sc, i, simulation.relevantAddresses || [])
          )}
      </ul>
      <style jsx>{`
        .raw_data_wrap {
          margin-top: 15px;
        }
        .raw_data_text {
          margin: 5px 0;
          padding: 24px;
          color: var(--green-40);
          overflow-wrap: break-word;
        }
      `}</style>
    </div>
  )
}
