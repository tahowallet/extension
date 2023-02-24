import React, { ReactElement, useCallback, useState } from "react"
import { Redirect } from "react-router-dom"
import { addAddressNetwork } from "@tallyho/tally-background/redux-slices/accounts"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { HexString } from "@tallyho/tally-background/types"
import { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedAddressInput from "../../../components/Shared/SharedAddressInput"
import OnboardingTip from "./OnboardingTip"
import OnboardingRoutes from "./Routes"

export default function ViewOnlyWallet(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const [redirect, setRedirect] = useState(false)
  const [addressOnNetwork, setAddressOnNetwork] = useState<
    AddressOnNetwork | undefined
  >(undefined)

  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.addWallet.viewOnly",
  })

  const { network } = useBackgroundSelector(selectCurrentAccount)

  const handleNewAddress = useCallback(
    (value: { address: HexString; name?: string } | undefined) => {
      if (value === undefined) {
        setAddressOnNetwork(undefined)
      } else {
        setAddressOnNetwork({
          address: value.address,
          network,
        })
      }
    },
    [network]
  )

  const handleSubmitViewOnlyAddress = useCallback(async () => {
    if (addressOnNetwork === undefined) {
      return
    }

    await dispatch(addAddressNetwork(addressOnNetwork))
    dispatch(setNewSelectedAccount(addressOnNetwork))
    setRedirect(true)
  }, [dispatch, addressOnNetwork])

  // Redirect to the final onboarding tab once an account is set
  if (redirect) {
    return <Redirect to={OnboardingRoutes.ONBOARDING_COMPLETE} />
  }

  // TODO remove the "embedded" variable and restyle
  return (
    <section className="fadeIn">
      <header>
        <img
          width="80"
          height="80"
          alt="Taho Gold"
          src="./images/doggo_readonly.svg"
        />
        <div>
          <h1>{t("title")}</h1>
          <div className="subtitle">{t("subtitle")}</div>
        </div>
      </header>
      <div className="content">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmitViewOnlyAddress()
          }}
        >
          <div className="input_wrap">
            <SharedAddressInput onAddressChange={handleNewAddress} />
          </div>
          <SharedButton
            type="primary"
            size="large"
            onClick={handleSubmitViewOnlyAddress}
            isDisabled={addressOnNetwork === undefined}
            showLoadingOnClick
            center
            isFormSubmit
          >
            {t("submit")}
          </SharedButton>
        </form>
        <OnboardingTip>{t("tip")}</OnboardingTip>
      </div>

      <style jsx>
        {`
          header {
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
            margin-bottom: 42px;
          }

          header img {
            border-radius: 22px;
          }

          header > div {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          header h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            margin: 0;
          }

          .subtitle {
            color: var(--green-40);
            max-width: 307px;
            text-align: center;
            line-height: 24px;
          }

          .content {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          form {
            margin-bottom: 52px;
            align-items: stretch;
          }

          .input_wrap {
            width: 320px;
            margin-bottom: 40px;
          }

          .center_horizontal {
            font-weight: 500;
          }
        `}
      </style>
    </section>
  )
}
