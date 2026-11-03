import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Link, Redirect, useParams } from "react-router-dom"
import { Trans, useTranslation } from "react-i18next"
import { makeSelectAccountBalancesOnNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import {
  selectInitializationTimeExpired,
  setNewSelectedAccount,
} from "@tallyho/tally-background/redux-slices/ui"
import { hideAsset } from "@tallyho/tally-background/redux-slices/assets"
import {
  isSmartContractFungibleAsset,
  SmartContractFungibleAsset,
} from "@tallyho/tally-background/assets"
import { Activity } from "@tallyho/tally-background/redux-slices/activities"
import { selectEVMNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import FullTabSection from "../../components/FullTab/FullTabSection"
import FullTabAssetTable, {
  assetKey,
} from "../../components/FullTab/FullTabAssetTable"
import SharedCheckbox from "../../components/Shared/SharedCheckbox"
import SharedButton from "../../components/Shared/SharedButton"
import SharedNetworkIcon from "../../components/Shared/SharedNetworkIcon"
import { accountPath, useFullTabAccount } from "../../components/FullTab/hooks"
import FullTabDialog from "../../components/FullTab/FullTabDialog"
import AssetVerifyToggler from "../../components/Wallet/UnverifiedAsset/AssetVerifyToggler"
import AssetWarning from "../../components/Wallet/UnverifiedAsset/AssetWarning"
import WalletActivityDetails from "../../components/Wallet/WalletActivityDetails"

/**
 * The full-tab page for the unverified assets an account holds on a network.
 * Assets can be selected and hidden in bulk, or reviewed and verified one at
 * a time in a dialog.
 */
export default function FullTabUnverifiedAssets(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "fullTab.unverified",
  })
  const { t: tWallet } = useTranslation("translation", { keyPrefix: "wallet" })
  const dispatch = useBackgroundDispatch()
  const { address, chainID } = useParams<{
    address: string
    chainID: string
  }>()
  const account = useFullTabAccount(address)
  const networks = useBackgroundSelector(selectEVMNetworks)
  const network = networks.find((candidate) => candidate.chainID === chainID)
  const initializationLoadingTimeExpired = useBackgroundSelector(
    selectInitializationTimeExpired,
  )

  const selectBalances = useMemo(
    () =>
      network ? makeSelectAccountBalancesOnNetwork({ address, network }) : null,
    [address, network],
  )
  const balances = useBackgroundSelector((state) =>
    selectBalances ? selectBalances(state) : undefined,
  )
  const unverifiedAssetAmounts = useMemo(
    () =>
      balances === undefined || balances === "loading"
        ? []
        : balances.unverifiedAssetAmounts,
    [balances],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())

  // The asset being reviewed in the popup's verify-or-hide details. Those
  // details read the selected account and network, so reviewing an asset
  // first selects this page's account and network.
  const [reviewedAsset, setReviewedAsset] =
    useState<SmartContractFungibleAsset | null>(null)
  const [activityDetails, setActivityDetails] = useState<{
    activityItem: Activity
    activityInitiatorAddress: string
  }>()
  const closeReview = useCallback(() => {
    setReviewedAsset(null)
    setActivityDetails(undefined)
  }, [])
  const review = async (asset: SmartContractFungibleAsset) => {
    if (network) {
      await dispatch(setNewSelectedAccount({ address, network }))
    }
    setReviewedAsset(asset)
  }
  const [isHiding, setIsHiding] = useState(false)

  // Drops selections for assets that are no longer listed, for example once
  // they have been hidden.
  useEffect(() => {
    const listed = new Set(
      unverifiedAssetAmounts.map(({ asset }) => assetKey(asset)),
    )
    setSelected((current) => {
      const next = new Set([...current].filter((id) => listed.has(id)))
      return next.size === current.size ? current : next
    })
  }, [unverifiedAssetAmounts])

  const allSelected =
    unverifiedAssetAmounts.length > 0 &&
    selected.size === unverifiedAssetAmounts.length

  const toggle = (id: string, value: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  const hideSelected = async () => {
    setIsHiding(true)
    try {
      await Promise.all(
        unverifiedAssetAmounts
          .filter(({ asset }) => selected.has(assetKey(asset)))
          .map(({ asset }) => asset)
          .filter(isSmartContractFungibleAsset)
          .map((asset) => dispatch(hideAsset({ asset }))),
      )
    } finally {
      setIsHiding(false)
    }
  }

  // Accounts only link here when they have unverified assets on the network.
  // Once there are none, e.g. after verifying or hiding the last one, or for
  // a network the wallet doesn't know, the account's asset list takes over.
  const hasLoaded = balances !== undefined && balances !== "loading"
  if (!network || (hasLoaded && unverifiedAssetAmounts.length === 0)) {
    return <Redirect to={accountPath(address)} />
  }

  return (
    <FullTabSection
      eyebrow={
        <Link className="back" to={accountPath(address)}>
          ← {account?.name ?? account?.shortenedAddress ?? address}
        </Link>
      }
      title={
        <div className="title">
          {network && <SharedNetworkIcon network={network} size={32} />}
          <h1>{t("title", { network: network?.name ?? chainID })}</h1>
        </div>
      }
      aside={
        <SharedButton
          type="primary"
          size="medium"
          isDisabled={selected.size === 0 || isHiding}
          isLoading={isHiding}
          onClick={hideSelected}
        >
          {selected.size === 0
            ? tWallet("verifiedAssets.dontShow")
            : `${tWallet("verifiedAssets.dontShow")} (${selected.size})`}
        </SharedButton>
      }
    >
      <p className="explainer">
        <Trans i18nKey="settings.unverifiedAssets.tooltip" />
      </p>
      <div className="table_card">
        <FullTabAssetTable
          assetAmounts={unverifiedAssetAmounts}
          initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          actionsWidth={168}
          leadingHeader={
            <SharedCheckbox
              checked={allSelected}
              onChange={(value) =>
                setSelected(
                  value
                    ? new Set(
                        unverifiedAssetAmounts.map(({ asset }) =>
                          assetKey(asset),
                        ),
                      )
                    : new Set(),
                )
              }
            />
          }
          renderLeading={({ asset }) => (
            <SharedCheckbox
              checked={selected.has(assetKey(asset))}
              onChange={(value) => toggle(assetKey(asset), value)}
            />
          )}
          onRowClick={({ asset }) => {
            const id = assetKey(asset)
            toggle(id, !selected.has(id))
          }}
          renderActions={({ asset }) =>
            isSmartContractFungibleAsset(asset) ? (
              <AssetVerifyToggler
                text={tWallet("unverifiedAssets.verifyAsset")}
                icon="notif-attention"
                color="var(--attention)"
                hoverColor="var(--white)"
                onClick={() => {
                  void review(asset)
                }}
              />
            ) : null
          }
        />
      </div>
      <FullTabDialog
        isOpen={reviewedAsset !== null}
        onClose={closeReview}
        label={tWallet("unverifiedAssets.verifyAsset")}
      >
        {activityDetails ? (
          <>
            <button
              type="button"
              className="dialog_back"
              onClick={() => setActivityDetails(undefined)}
            >
              ← {reviewedAsset?.symbol}
            </button>
            <WalletActivityDetails
              activityItem={activityDetails.activityItem}
              activityInitiatorAddress={
                activityDetails.activityInitiatorAddress
              }
            />
          </>
        ) : (
          reviewedAsset && (
            <AssetWarning
              asset={reviewedAsset}
              close={closeReview}
              openActivityDetails={setActivityDetails}
            />
          )
        )}
      </FullTabDialog>
      <style jsx>{`
        .title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        h1 {
          margin: 0;
          font-family: "Quincy CF", serif;
          font-size: 36px;
          line-height: 44px;
          font-weight: 500;
          color: var(--text-strong);
        }

        :global(.back) {
          color: var(--green-40);
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          font-size: 16px;
          transition: color 0.2s ease;
        }
        :global(.back:hover) {
          color: var(--trophy-gold);
        }
        .explainer {
          margin: -8px 0 24px;
          color: var(--green-40);
          max-width: 640px;
        }
        .dialog_back {
          margin: -8px 16px 8px;
          color: var(--green-40);
          font-size: 14px;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .dialog_back:hover {
          color: var(--trophy-gold);
        }
        .table_card {
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          overflow: hidden;
        }
      `}</style>
    </FullTabSection>
  )
}
