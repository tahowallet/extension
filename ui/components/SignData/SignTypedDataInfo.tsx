import {
  isProbablyHexString,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import { selectAssetViaContract } from "@tallyho/tally-background/redux-slices/assets"
import { SignTypedDataRequest } from "@tallyho/tally-background/services/signing/types"
import dayjs from "dayjs"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import capitalize from "../../utils/capitalize"
import SharedButton from "../Shared/SharedButton"

type SignTypedDataInfoProps = {
  typedDataRequest: SignTypedDataRequest
}

export default function SignTypedDataInfo({
  typedDataRequest,
}: SignTypedDataInfoProps): ReactElement {
  const { typedData } = typedDataRequest
  const { message } = typedData
  const { verifyingContract, chainId } = typedData.domain

  const assets = useBackgroundSelector((state) => state.assets)

  const correspondingAsset =
    verifyingContract && chainId
      ? selectAssetViaContract(assets, verifyingContract, String(chainId))
      : undefined

  const keys = Object.keys(typedDataRequest.typedData.message)
  return (
    <div className="messages">
      <div className="message">
        <div className="key">Type</div>
        <div className="light">{typedDataRequest.typedData.primaryType}</div>
      </div>
      {keys.map((key) => {
        const value = message[key]
        if (typeof value === "string" && isProbablyHexString(value)) {
          return (
            <div key={key} className="message">
              <div className="key">{capitalize(key)}</div>
              <div className="value">
                {truncateAddress(value)}{" "}
                <SharedButton
                  type="tertiaryGray"
                  size="medium"
                  icon="external"
                  customHeight="100%"
                  iconSize="secondaryMedium"
                  onClick={() => {
                    window
                      .open(`https://etherscan.io/address/${value}`, "_blank")
                      ?.focus()
                  }}
                >
                  {/* No children desired */}
                </SharedButton>
              </div>
            </div>
          )
        }
        if (key === "value") {
          const formattedValue = correspondingAsset
            ? Number(value) / 10 ** correspondingAsset.decimals
            : value
          return (
            <div key={key} className="message">
              <div className="key">{capitalize(key)}</div>
              <div className="value">{`${formattedValue} ${typedDataRequest.typedData.domain.name}`}</div>
            </div>
          )
        }
        if (
          // matches uniswap & 0x expiration field
          ["deadline", "expiry"].includes(key) &&
          typeof value === "number" &&
          // weak check for unix seconds timestamp
          String(value).length === 10
        ) {
          return (
            <div key={key} className="message">
              <div className="key">{capitalize(key)}</div>
              <div className="value">
                {dayjs.unix(value).format("DD MMM YYYY")}
              </div>
            </div>
          )
        }
        return (
          <div key={key} className="message">
            <div className="key">{capitalize(key)}</div>
            <div className="value">{`${message[key]}`}</div>
          </div>
        )
      })}
      <style jsx>
        {`
          .messages {
            display: flex;
            flex-flow: column;
            width: 100%;
            padding-top: 16px;
          }
          .message {
            display: flex;
            justify-content: space-between;
            padding: 6px 16px;
          }
          .value {
            color: #ccd3d3;
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
          }
          .key {
            color: var(--green-40);
          }
        `}
      </style>
    </div>
  )
}
