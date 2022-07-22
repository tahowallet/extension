// @ts-check
//
import React, { ReactElement, useEffect, useMemo, useState } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import type { AssetMetadata } from "@tallyho/tally-background/assets"
import {
  offChainProviders,
  Wealthsimple,
} from "@tallyho/tally-background/constants/off-chain"
import { OffChainAsset } from "@tallyho/tally-background/assets"
import WalletAssetListItem from "./WalletAssetListItem"
import { OffChainService } from "../../services/OffChainService"

interface Props {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function WalletAssetList(props: Props): ReactElement {
  const { assetAmounts, initializationLoadingTimeExpired } = props
  const [rawOffChainAssets, setRawOffChainAssets] = useState<OffChainAsset[]>(
    []
  )

  const providerName =
    localStorage.getItem("offChainProvider") || Wealthsimple.name

  const offChainProvider =
    offChainProviders.find((provider) => provider.name === providerName) ||
    Wealthsimple

  const copy = assetAmounts[0]

  const offChainAssets: CompleteAssetAmount[] = useMemo(
    () =>
      rawOffChainAssets.map((asset) => ({
        ...copy,
        decimalAmount: asset.amount,
        localizedDecimalAmount: new Intl.NumberFormat().format(asset.amount),
        asset: {
          ...copy.asset,
          name: asset.label,
          symbol: asset.currencySymbol,
          metadata: {
            ...(copy.asset.metadata as AssetMetadata),
            logoURL: offChainProvider.logoUrl,
          },
        },
      })),
    [copy, offChainProvider.logoUrl, rawOffChainAssets]
  )

  useEffect(() => {
    const loadOffChainAssets = async () => {
      const response = await OffChainService.assets({
        provider: offChainProvider,
        userId: "foobar",
      })
      setRawOffChainAssets(response.assets)
    }
    loadOffChainAssets()
    console.log("re-rendering")
  }, [])

  if (!assetAmounts) return <></>

  return (
    <ul>
      {[...offChainAssets, ...assetAmounts].map((assetAmount) => {
        return (
          <WalletAssetListItem
            assetAmount={assetAmount}
            key={assetAmount.asset.name}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          />
        )
      })}
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
  )
}
