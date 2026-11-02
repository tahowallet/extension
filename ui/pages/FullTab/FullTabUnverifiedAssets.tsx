import React, { ReactElement, useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { makeSelectAccountBalancesOnNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { selectInitializationTimeExpired } from "@tallyho/tally-background/redux-slices/ui"
import { hideAsset } from "@tallyho/tally-background/redux-slices/assets"
import { isSmartContractFungibleAsset } from "@tallyho/tally-background/assets"
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

/**
 * The unverified assets an account holds on a network, which can be selected
 * and hidden in bulk.
 */
export default function FullTabUnverifiedAssets(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "fullTab.unverified",
  })
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
          {t("hideSelected", { count: selected.size })}
        </SharedButton>
      }
    >
      <p className="explainer">{t("explainer")}</p>
      <div className="table_card">
        <FullTabAssetTable
          assetAmounts={unverifiedAssetAmounts}
          initializationLoadingTimeExpired={initializationLoadingTimeExpired}
          emptyMessage={t("empty")}
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
        />
      </div>
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
          margin: -16px 0 0;
          color: var(--green-40);
          max-width: 640px;
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
