import { isProbablyEVMAddress } from "@tallyho/tally-background/lib/utils"
import { EnrichedSignTypedDataRequest } from "@tallyho/tally-background/services/enrichment"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { capitalize } from "../../../../utils/textUtils"
import SharedAddress from "../../../Shared/SharedAddress"
import SharedIcon from "../../../Shared/SharedIcon"
import DataSignatureDetails from "."

function TypedDataFieldValue({ value }: { value: unknown }): ReactElement {
  const { t } = useTranslation("translation")

  if (typeof value === "string" && isProbablyEVMAddress(value)) {
    return (
      <div className="value">
        <SharedAddress address={value} />
        <SharedIcon
          icon="new_tab@2x.png"
          width={16}
          height={16}
          color="var(--green-40)"
          hoverColor="var(--trophy-gold)"
          ariaLabel={t("viewAddressOnBlockExplorer", {
            blockExplorer: "Etherscan",
          })}
          onClick={() => {
            window
              .open(`https://etherscan.io/address/${value}`, "_blank")
              ?.focus()
          }}
        />
        <style jsx>
          {`
            div {
              display: flex;
              column-gap: 5px;
              align-items: center;
              color: var(--green-20);
            }
          `}
        </style>
      </div>
    )
  }

  return (
    <div title={String(value)}>
      {String(value)}
      <style jsx>
        {`
          div {
            color: var(--green-20);
            margin-left: 10px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `}
      </style>
    </div>
  )
}

type BasicTypedDataDetailsProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  primaryType: string
  fieldsToDisplay: T
}

function BasicTypedDataDetails<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  primaryType,
  fieldsToDisplay,
}: BasicTypedDataDetailsProps<T>): ReactElement {
  const { t } = useTranslation()

  const keys = Object.keys(fieldsToDisplay)

  return (
    <div className="messages">
      <div className="message">
        <div className="key">{t("signing.type")}</div>
        <TypedDataFieldValue value={primaryType} />
      </div>
      {keys.map((key) => {
        const value = fieldsToDisplay[key]
        return (
          <div key={key} className="message">
            <div className="key">{capitalize(key)}</div>
            <TypedDataFieldValue value={value} />
          </div>
        )
      })}
      <style jsx>
        {`
          .messages {
            display: flex;
            flex-flow: column;
            font-weight: 500;
            width: 100%;
            padding: 16px 0 0;
          }
          .icon_external {
            mask-image: url("./images/new_tab@2x.png");
            mask-size: 16px 16px;
            width: 16px;
            margin-left: 4px;
            font-weight: bold;
            height: 16px;
            background-color: var(--trophy-gold);
          }
          .message {
            display: flex;
            justify-content: space-between;
            padding-top: 8px;
          }
          .key {
            color: var(--green-40);
          }
        `}
      </style>
    </div>
  )
}

export type TypedDataSignatureDetailsProps = {
  typedDataRequest: EnrichedSignTypedDataRequest
}

export default function TypedDataSignatureDetails({
  typedDataRequest,
}: TypedDataSignatureDetailsProps): ReactElement {
  const { annotation, typedData } = typedDataRequest

  switch (annotation?.type) {
    case "EIP-2612":
      return (
        <DataSignatureDetails requestingSource={capitalize(annotation.source)}>
          <BasicTypedDataDetails
            primaryType={typedData.primaryType}
            fieldsToDisplay={annotation.displayFields}
          />
        </DataSignatureDetails>
      )
    default:
      return (
        <DataSignatureDetails requestingSource={typedData.domain.name}>
          <BasicTypedDataDetails
            primaryType={typedData.primaryType}
            fieldsToDisplay={typedData.message}
          />
        </DataSignatureDetails>
      )
  }
}
