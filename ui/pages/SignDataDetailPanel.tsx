import { selectTypedData } from "@tallyho/tally-background/redux-slices/signing"
import { EnrichedSignTypedDataRequest } from "@tallyho/tally-background/services/enrichment"
import classNames from "classnames"
import React, { ReactElement } from "react"
import SharedSkeletonLoader from "../components/Shared/SharedSkeletonLoader"
import SignTypedDataInfo from "../components/SignData/SignTypedDataInfo"
import { useBackgroundSelector } from "../hooks"
import capitalize from "../utils/capitalize"

const getSourceLabel = (
  typedDataRequest: EnrichedSignTypedDataRequest
): string => {
  const {
    annotation,
    typedData: { domain },
  } = typedDataRequest
  if (annotation.type !== "unrecognized") {
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
          <div className="light">{`${message[key]}`}</div>
        </div>
      ))}
    </>
  )
}

export default function SignDataDetailPanel(): ReactElement {
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
            {isInternal
              ? "Your signature is required"
              : "A dapp is requesting your signature"}
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
        .light {
          color: #ccd3d3;
        }
        .key {
          color: var(--green-40);
        }
        .divider {
          width: 80%;
          height: 2px;
          opacity: 60%;
          background-color: var(--green-120);
        }
        .single_message {
          display: flex;
          flex-direction: column;
          gap: 24px;
          text-align: left;
          padding: 16px;
          width: 80%;
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
