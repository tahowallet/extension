import React, { ReactElement } from "react"
import { EIP4361Data } from "@tallyho/tally-background/utils/signing"
import { useTranslation } from "react-i18next"
import { NETWORK_BY_CHAIN_ID } from "@tallyho/tally-background/constants"
import SignDataInfo from "./SignDataInfo"

type Props = {
  signingData: EIP4361Data
}

// this overides the type to expect EIP4361Data
export default function EIP4361Info({ signingData }: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signing.EIP4361" })

  const chainName =
    NETWORK_BY_CHAIN_ID[signingData.chainId.toString()]?.name ?? "Unknown"

  return (
    <>
      <div className="subtext">
        {t("subtext1")}
        <br />
        {t("subtext2")}
      </div>
      <div className="address">{signingData.address}</div>
      <div className="divider spaced" />
      {signingData?.statement ? ( // FIXME Content should be on the next line for this one.
        <SignDataInfo label={t("statement")} content={signingData.statement} />
      ) : null}
      <SignDataInfo label={t("nonce")} content={signingData.nonce} />
      <SignDataInfo label={t("version")} content={signingData.version} />
      <SignDataInfo
        label={t("chainID")}
        content={`${signingData.chainId.toString()} (${chainName})`}
      />
      {signingData?.expiration ? (
        <SignDataInfo
          label={t("expiration")}
          content={signingData.expiration}
        />
      ) : null}
      <style jsx>{`
        .subtext {
          color: var(--green-40);
          line-height: 24px;
          font-size: 16px;
          margin-bottom: 4px;
          margin-top: 16px;
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
