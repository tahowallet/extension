import React, { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { isLedgerSupported } from "@tallyho/tally-background/services/ledger"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import OnboardingRoutes from "./Routes"
import { intersperseWith } from "../../../utils/lists"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedIcon from "../../../components/Shared/SharedIcon"

type AddWalletRowProps = {
  icon: string
  label: string
  url?: string
  onClick?: () => void
}

export function AddWalletRow({
  icon,
  url,
  label,
  onClick,
}: AddWalletRowProps): JSX.Element {
  return (
    <SharedButton
      style={{ width: "100%" }}
      type="unstyled"
      size="medium"
      linkTo={url}
      onClick={onClick}
    >
      <div className="option">
        <SharedIcon icon={icon} width={32} color="currentColor" />
        {label}
        <SharedIcon
          customStyles="margin-left: auto;"
          icon="chevron_right.svg"
          width={16}
          color="currentColor"
        />
      </div>
      <style jsx>{`
        .option {
          display: flex;
          width: 100%;
          gap: 10px;
          align-items: center;
          background-color: var(--green-95);
          font-size: 18px;
          font-weight: 600;
          color: var(--green-20);
          line-height: 24px;
        }

        .option:hover {
          color: var(--trophy-gold);
        }
      `}</style>
    </SharedButton>
  )
}

export default function AddWalletOptions(): JSX.Element {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet",
  })

  const optionsWithSpacer = useMemo(() => {
    const options = [
      {
        label: t("options.importSeed"),
        icon: "add_wallet/import.svg",
        url: OnboardingRoutes.IMPORT_SEED,
        isAvailable: true,
      },
      {
        label: t("options.importPrivateKey"),
        icon: "add_wallet/import_priv_key.svg",
        url: OnboardingRoutes.IMPORT_PRIVATE_KEY,
        isAvailable: isEnabled(FeatureFlags.SUPPORT_PRIVATE_KEYS),
      },
      {
        label: t("options.ledger"),
        icon: "add_wallet/ledger.svg",
        url: OnboardingRoutes.LEDGER,
        isAvailable: isLedgerSupported,
      },
      {
        label: t("options.readOnly"),
        icon: "add_wallet/preview.svg",
        url: OnboardingRoutes.VIEW_ONLY_WALLET,
        isAvailable: true,
      },
    ].filter((item) => item.isAvailable)

    return intersperseWith(options, (i) => `spacer-${i}` as const)
  }, [t])

  return (
    <>
      {optionsWithSpacer.map((option) => {
        if (typeof option === "string") {
          return <li key={option} className="spacer" role="presentation" />
        }

        const { label, icon, url } = option
        return (
          <li key={url}>
            <AddWalletRow icon={icon} url={url} label={label} />
          </li>
        )
      })}
      <style jsx>
        {`
          li {
            display: flex;
          }

          .spacer {
            width: 100%;
            border: 0.5px solid var(--green-120);
          }
        `}
      </style>
    </>
  )
}
