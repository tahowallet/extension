// @ts-check
//
import React, { ReactElement } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SharedBanner from "../Shared/SharedBanner"
import SharedButton from "../Shared/SharedButton"
import SharedAddress from "../Shared/SharedAddress"
import WalletAssetListItem from "./WalletAssetListItem"

type TitledSlideUpProps = Parameters<typeof SharedSlideUpMenu>[0] & {
  title: string
}

function TitledSlideUpMenu(props: TitledSlideUpProps): ReactElement {
  const { title, children, ...others } = props
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <SharedSlideUpMenu {...others}>
      <span className="title">
        <strong>{title}</strong>
      </span>
      {children}
      <style jsx global>{`
        div.slide_up_menu {
          padding-top: 20px !important;
        }
        button.icon {
          margin-top: 4px;
        }
        .title {
          margin-left: 24px;
        }
      `}</style>
    </SharedSlideUpMenu>
  )
}

interface Props {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function WalletAssetList(props: Props): ReactElement {
  const { assetAmounts, initializationLoadingTimeExpired } = props
  if (!assetAmounts) return <></>
  return (
    <>
      <TitledSlideUpMenu
        isOpen
        close={() => {}}
        size="small"
        title="Asset imported from transaction history"
      >
        <style jsx global>{`
          .banner_wrap {
            margin-left: 16px !important;
            margin-top: 10px !important;
            margin-bottom: 14px;
          }
          #close_asset_warning {
            margin-left: 24px;
            margin-top: 34px;
          }
        `}</style>
        <style jsx>{`
          .warning_text {
            font-size: 16px;
            line-height: 24px;
            font-weight: 500;
            color: var(--attention);
          }
          ul.asset_details {
            margin-bottom: 30px;
          }
          ul.asset_details > li {
            margin-left: 24px;
            margin-right: 24px;
            display: flex;
            justify-content: space-between;
            height: 24px;
            align-items: center;
          }
          .right {
            float: right;
            display: flex;
            align-items: flex-end;
          }
        `}</style>
        <SharedBanner icon="notif-attention" iconColor="var(--attention)">
          <span className="warning_text">Asset has not been verified yet!</span>
          <br />
          <span>Only transact with assets you trust.</span>
        </SharedBanner>
        <ul className="asset_details">
          <li>
            Name
            <div className="right">
              <strong>KEEP</strong>
            </div>
          </li>
          <li>
            Contract address
            <div className="right">
              <SharedAddress address="0x85eee30c52b0b379b046fb0f85f4f3dc3009afec" />
            </div>
          </li>
        </ul>
        <SharedButton size="medium" type="secondary" id="close_asset_warning">
          Close
        </SharedButton>
      </TitledSlideUpMenu>
      <ul>
        {assetAmounts.map((assetAmount) => (
          <WalletAssetListItem
            assetAmount={assetAmount}
            key={assetAmount.asset.symbol}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          />
        ))}
        {!initializationLoadingTimeExpired && (
          <li className="loading">Digging deeper...</li>
        )}
        <style jsx>{`
          .loading {
            display: flex;
            justify-content: center;
            padding-top: 5px;
            padding-bottom: 40px;
            color: var(--green-60);
            font-size: 15px;
          }
        `}</style>
      </ul>
    </>
  )
}
