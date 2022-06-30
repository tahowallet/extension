import {
  EIP4361Data,
  SignDataMessageType,
} from "@tallyho/tally-background/utils/signing"
import { selectSigningData } from "@tallyho/tally-background/redux-slices/signing"
import React from "react"
import { EIP191Info, EIP4361Info } from "../components/SignData"
import { useBackgroundSelector } from "../hooks"

export default function PersonalSignDetailPanel(): JSX.Element {
  const signingDataRequest = useBackgroundSelector(selectSigningData)

  if (signingDataRequest === undefined) return <></>

  return (
    <div className="primary_info_card standard_width">
      <div className="sign_block">
        <div className="container">
          {(() => {
            switch (signingDataRequest.messageType) {
              case SignDataMessageType.EIP4361:
                return (
                  <EIP4361Info
                    signingData={signingDataRequest.signingData as EIP4361Data}
                  />
                )
              case SignDataMessageType.EIP191:
              default:
                return (
                  <EIP191Info
                    account={signingDataRequest.account.address}
                    internal={false}
                    signingData={signingDataRequest.signingData}
                  />
                )
            }
          })()}
        </div>
      </div>
      <style jsx>{`
        .primary_info_card {
          display: block;
          height: fit-content;
          border-radius: 16px;
          background-color: var(--hunter-green);
          margin: 16px 0px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sign_block {
          display: flex;
          width: 100%;
          flex-direction: column;
          justify-content: space-between;
        }
        .container {
          display: flex;
          margin: 20px 16px;
          flex-direction: column;
          align-items: center;
          font-size: 16px;
          line-height: 24px;
        }
      `}</style>
    </div>
  )
}
