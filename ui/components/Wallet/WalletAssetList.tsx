// @ts-check
//
import React, { ReactElement, useEffect, useState } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import WalletAssetListItem from "./WalletAssetListItem"
import { OffChainService } from "../../services/OffChainService";
import { offChainProviders, Wealthsimple } from "@tallyho/tally-background/constants/off-chain";
import { OffChainProvider } from "@tallyho/tally-background/accounts";

interface Props {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function WalletAssetList(props: Props): ReactElement {
  const { assetAmounts, initializationLoadingTimeExpired } = props;
  const [offChainAssets, setOffChainAssets] = useState<CompleteAssetAmount[]>([])

  const providerName = localStorage.getItem('offChainProvider') || Wealthsimple.name;

  const offChainProvider = offChainProviders.find(provider => (
    provider.name === providerName
  ))!;

  useEffect(() => {
    loadOffChainAccounts()
  }, []);

  async function loadOffChainAccounts() {

    setOffChainAssets([]);
    const assets = (await OffChainService.assets({userId: "foobar"})).assets;
    const newOffChainAssets = assets.map(asset => {
      const offChainAsset = Object.assign({}, assetAmounts[0]); // TODO: fix pass by reference bug, find a way to deep copy
      offChainAsset.asset.symbol = asset.currencySymbol;
      offChainAsset.decimalAmount = asset.amount;
      offChainAsset.localizedDecimalAmount = new Intl.NumberFormat().format(asset.amount)
      offChainAsset.asset.metadata!.logoURL = offChainProvider.logoUrl;
      return offChainAsset;
    });
    setOffChainAssets(newOffChainAssets);
  };

  if (!assetAmounts) return <></>

  return (
    <ul>
      {[...offChainAssets, ...assetAmounts].map((assetAmount) => (
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
  )
}
