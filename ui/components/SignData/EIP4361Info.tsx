import React from "react"
import { EIP4361Data } from "@tallyho/tally-background/redux-slices/signing"
import SignDataInfo from "./SignDataInfo"

// can add networks, ideally should come from some sort of network config
// TODO fetch this from NETWORK config
const CHAIN_NAMES: (chain: number) => string = (chain) => {
  switch (chain) {
    case 1:
      return "Ethereum"
    default:
      return "Unknown"
  }
}

// this overides the type to expect EIP4361Data
const EIP4361Info: React.FC<{ signingData: EIP4361Data }> = ({
  signingData,
}) => {
  return (
    <>
      <div className="domain">{signingData.domain}</div>
      <div className="divider spaced" />
      <div className="subtext">
        Wants you to sign in with your
        <br />
        Ethereum account:
      </div>
      <div className="address">{signingData.address}</div>
      <div className="divider spaced" />
      {signingData?.statement ? (
        <SignDataInfo label="Statement" content={signingData.statement} />
      ) : null}
      <SignDataInfo label="Nonce" content={signingData.nonce} />
      <SignDataInfo label="Version" content={signingData.version} />
      <SignDataInfo
        label="Chain ID"
        content={`${signingData.chainId.toString()} (${CHAIN_NAMES(
          signingData.chainId
        )})`}
      />
      {signingData?.expiration ? (
        <SignDataInfo label="Expiration" content={signingData.expiration} />
      ) : null}
      <style jsx>{`
        .subtext {
          color: var(--green-40);
          line-height: 24px;
          font-size: 16px;
          margin-bottom: 4px;
        }
        .domain,
        .address,
        .subtext {
          text-align: center;
        }
        .address {
          line-break: anywhere;
          max-width: 80%;
          font-size: 16px;
        }
        .spaced {
          margin: 16px 0;
        }
      `}</style>
    </>
  )
}

export default EIP4361Info
