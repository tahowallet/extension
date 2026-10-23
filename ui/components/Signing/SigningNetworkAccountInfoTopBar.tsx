import React, { ReactElement } from "react"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { useTranslation } from "react-i18next"
import NetworkUnreachableWarning from "../Shared/NetworkUnreachableWarning"
import SharedCurrentAccountInformation from "../Shared/SharedCurrentAccountInformation"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import useShouldBlockSigning from "./Signer/useShouldBlockSigning"

type Props = {
  accountTotal: AccountTotal
}

export default function SigningNetworkAccountInfoTopBar({
  accountTotal,
}: Props): ReactElement {
  const { t } = useTranslation()
  const { blockReason } = useShouldBlockSigning()
  const { network, shortenedAddress, name, avatarURL } = accountTotal

  return (
    <div className="top_bar_wrap standard_width">
      <div className="row_part network">
        <div className="network_icon_wrap">
          <SharedNetworkIcon network={network} size={16} />
          {/*
           * A sigil on the network this signature would go to. No chain handed
           * over, so the tooltip explains without linking: navigating to
           * settings from here would abandon the request, and for a dApp's
           * request there is no way back to it.
           */}
          {blockReason === "network-unreachable" && (
            <NetworkUnreachableWarning
              size={18}
              // Kept in step with the network indicator in the top menu, which
              // is where these numbers are explained.
              style={{
                position: "absolute",
                padding: 0,
                bottom: -4,
                right: -9,
              }}
              tooltipHorizontalPosition="right"
            />
          )}
        </div>
        <span className="network_name">
          {network.name ?? t("signTransaction.unknownNetwork")}
        </span>
      </div>
      <div className="row_part account">
        <SharedCurrentAccountInformation
          address={accountTotal.address}
          shortenedAddress={shortenedAddress}
          name={name}
          avatarURL={avatarURL}
        />
      </div>
      <style jsx>
        {`
          .top_bar_wrap {
            margin: 0 auto;
            margin-top: 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            gap: 5px;
          }
          .network {
            flex-shrink: 0;
          }
          .network_name {
            color: var(--green-20);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
          }
          .row_part {
            display: flex;
            align-items: center;
          }
          .account_avatar {
            border-radius: 2px;
            width: 24px;
            height: 24px;
            background-color: white;
            margin-left: 8px;
            background: url("./images/portrait.png");
            background-size: cover;
          }
          .network_icon_wrap {
            position: relative;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            background-color: var(--green-80);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 5px;
          }
          .account {
            min-width: 0;
          }
        `}
      </style>
    </div>
  )
}
