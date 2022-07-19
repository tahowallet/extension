// @ts-check
//
import React, { ReactElement, useEffect, useState } from "react"
import { CompleteAssetAmount } from "@tallyho/tally-background/redux-slices/accounts"
import WalletAssetListItem from "./WalletAssetListItem"
import { OffChainService } from "../../services/OffChainService";

interface Props {
  assetAmounts: CompleteAssetAmount[]
  initializationLoadingTimeExpired: boolean
}

export default function WalletAssetList(props: Props): ReactElement {
  const { assetAmounts, initializationLoadingTimeExpired } = props;
  const [offChainAssets, setOffChainAssets] = useState<CompleteAssetAmount[]>([])

  const CADAccount = assetAmounts[0];

  useEffect(() => {
    console.log("useEffect");
    loadOffChainAccounts()
  }, []);

  async function loadOffChainAccounts() {
    console.log("loadOffChainAccounts");

    setOffChainAssets([]);
    const assets = (await OffChainService.assets({userId: "foobar"})).assets;
    console.log({assets});
    const newOffChainAssets = assets.map(asset => {
      const offChainAsset = Object.assign({}, assetAmounts[0]); // TODO: fix pass by reference bug, find a way to deep copy
      offChainAsset.asset.symbol = asset.currencySymbol;
      offChainAsset.decimalAmount = asset.amount;
      offChainAsset.localizedDecimalAmount = new Intl.NumberFormat().format(asset.amount)
      offChainAsset.asset.metadata!.logoURL = "https://media.glassdoor.com/sqll/908271/wealthsimple-squareLogo-1625583235383.png";
      return offChainAsset;
    });
    console.log({newOffChainAssets});
    setOffChainAssets(newOffChainAssets);
  };

  if (!assetAmounts) return <></>

  console.log({offChainAssets, assetAmounts});
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
