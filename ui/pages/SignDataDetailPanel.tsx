import { selectTypedData } from "@tallyho/tally-background/redux-slices/signing"
import { EnrichedSignTypedDataRequest } from "@tallyho/tally-background/services/enrichment"
import classNames from "classnames"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedSkeletonLoader from "../components/Shared/SharedSkeletonLoader"
import SignTypedDataInfo from "../components/SignData/SignTypedDataInfo"
import { useBackgroundSelector } from "../hooks"
import { capitalize } from "../utils/textUtils"

const getSourceLabel = (
  typedDataRequest: EnrichedSignTypedDataRequest
): string => {
  const {
    annotation,
    typedData: { domain },
  } = typedDataRequest
  if (annotation !== undefined) {
    return capitalize(annotation.source)
  }

  return domain.name ?? ""
}

function SignDataMessage({
  typedDataRequest,
}: {
  typedDataRequest: EnrichedSignTypedDataRequest
}): ReactElement {
  const {
    typedData: { message },
  } = typedDataRequest
  const keys = Object.keys(message)

  if (keys.length > 2)
    return <SignTypedDataInfo typedDataRequest={typedDataRequest} />

  return (
    <>
      {keys.map((key) => (
        <div className="single_message">
          <div className="key">{capitalize(key)}</div>
          <div className="light ellipsis">{`${message[key]}`}</div>
        </div>
      ))}
      <style jsx>{`
        .single_message {
          display: flex;
          justify-content: space-between;
          text-align: left;
          margin: 16px;
          width: 80%;
        }
        .light {
          color: #ccd3d3;
        }
        .key {
          color: var(--green-40);
          margin-right: 8px;
        }
      `}</style>
    </>
  )
}

export default function SignDataDetailPanel(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signing" })
  const typedDataRequest = useBackgroundSelector(selectTypedData)

  /* TODO: should be `true` if the request originates from within the wallet */
  const isInternal = false

  return (
    <>
      <div className="sign_block">
        <div
          className={classNames("container", {
            loading: !typedDataRequest,
          })}
        >
          <div className="label header">
            {isInternal ? t("signatureRequired") : t("dappSignatureRequest")}
          </div>
          <div className="divider" />
          <SharedSkeletonLoader
            isLoaded={!!typedDataRequest}
            customStyles="margin: 10px 0;"
            height={24}
            width={280}
          >
            {!!typedDataRequest && (
              <div className="source">{getSourceLabel(typedDataRequest)}</div>
            )}
          </SharedSkeletonLoader>
          <div className="divider" />
          <SharedSkeletonLoader
            isLoaded={!!typedDataRequest}
            customStyles="margin: 10px 0;"
            height={24}
            width={280}
          >
            {!!typedDataRequest && (
              <SignDataMessage typedDataRequest={typedDataRequest} />
            )}
          </SharedSkeletonLoader>
        </div>
      </div>

      <style jsx>{`
        .sign_block {
          display: flex;
          width: 100%;
          flex-direction: column;
          justify-content: space-between;
        }
        .label {
          color: var(--green-40);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
        .header {
          padding: 16px 0;
        }
        .source {
          padding: 20px 0;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
        .message {
          display: flex;
          justify-content: space-between;
          padding: 6px 16px;
        }
        .value {
          overflow-wrap: anywhere;
          max-width: 220px;
          text-align: right;
        }
        .divider {
          width: 80%;
          height: 2px;
          opacity: 60%;
          background-color: var(--green-120);
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .container.loading {
          height: 355px;
        }
      `}</style>
    </>
  )
}
