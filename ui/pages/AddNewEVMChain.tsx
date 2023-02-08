import React, { useEffect, useState } from "react"
import {
  dispatchAddNetworkUserResponse,
  getAddNetworkRequestDetails,
} from "@tallyho/tally-background/redux-slices/ui"
import { AddChainRequestData } from "@tallyho/tally-background/services/provider-bridge"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch } from "../hooks"
import SharedButton from "../components/Shared/SharedButton"
import SharedIcon from "../components/Shared/SharedIcon"

export default function AddNewEVMChain(): JSX.Element {
  const parsedQueryString = new URLSearchParams(window.location.search)
  const { requestId } = Object.fromEntries(parsedQueryString.entries())

  const [networkDetails, setNetworkDetails] =
    useState<AddChainRequestData | null>(null)

  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    dispatch(getAddNetworkRequestDetails(requestId)).then((chainDetails) =>
      setNetworkDetails(chainDetails as unknown as AddChainRequestData)
    )
  }, [dispatch, requestId])

  if (!networkDetails) {
    return <></>
  }

  const {
    chainId,
    chainName,
    nativeCurrency,
    iconUrl,
    rpcUrls,
    blockExplorerUrl,
    favicon,
    siteTitle,
  } = networkDetails

  function handleUserResponse(success: boolean): void {
    dispatch(dispatchAddNetworkUserResponse([requestId, success])).then(() =>
      window.close()
    )
  }

  return (
    <div className="standard_width">
      <form action="#">
        <header>
          <h1>
            <img width={24} alt={siteTitle} src={favicon} /> {siteTitle}
          </h1>
          <p>{t("addNewChain.subtitle")}</p>
        </header>
        <div className="details-containe_">
          <div className="add_chain_imgs">
            <div className="new_chain_logo" />
            <div className="plus_wrapper">
              <SharedIcon
                width={16}
                height={16}
                color="var(--trophy-gold)"
                icon="plus@2x.png"
              />
            </div>
            <div className="tally_logo" />
          </div>
          <dl className="chain_details">
            <div className="row">
              <dt>{t("addNewChain.name")}</dt>
              <dd>{chainName}</dd>
            </div>
            <div className="row">
              <dt>{t("addNewChain.chainId")}</dt>
              <dd>{chainId}</dd>
            </div>
            <div className="row">
              <dt>{t("addNewChain.currency")}</dt>
              <dd>{nativeCurrency.symbol}</dd>
            </div>
            <dt>{t("addNewChain.rpc")}</dt>
            <dd className="rpc_url">{rpcUrls[0]}</dd>
            <dt>{t("addNewChain.explorer")}</dt>
            <dd>{blockExplorerUrl}</dd>
          </dl>
        </div>
        <footer>
          <SharedButton
            size="large"
            type="secondary"
            onClick={() => handleUserResponse(false)}
          >
            {t("addNewChain.cancel")}
          </SharedButton>
          <SharedButton
            size="large"
            type="primary"
            onClick={() => handleUserResponse(true)}
          >
            {t("addNewChain.submit")}
          </SharedButton>
        </footer>
      </form>
      <style jsx>{`
        .add_chain_imgs {
          display: flex;
          justify-content: center;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--castle-black);
        }

        .new_chain_logo {
          width: 56px;
          height: 56px;
          border-radius: 8px;
          ${iconUrl ? `background-image: url("${iconUrl}");` : ""}
          background-color: var(--green-80);
        }

        .tally_logo {
          background: url("./images/doggo_gold.svg") center / 65px no-repeat;
          height: 56px;
          width: 56px;
          border-radius: 16px;
        }

        .plus_wrapper {
          align-self: center;
          position: relative;
          border: 4px solid var(--green-120);
          border-radius: 50%;
          background-color: var(--hunter-green);
          padding: 4px;
          margin-right: -4px;
          margin-left: -4px;
        }

        form {
          padding-top: 20px;
        }

        header {
          margin: 18px 0 34px;
        }

        header h1 {
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Segment;
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
          gap: 6px;
        }
        header p {
          font-family: Segment;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: center;
        }

        .details_container {
          background: var(--green-120);
          border-radius: 16px;
          padding: 16px 24px;
          margin-bottom: 16px;
        }

        .chain_details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .row {
          display: flex;
          justify-content: space-between;
        }

        dt,
        dd {
          margin: 0;
        }

        dt {
          color: var(--green-40);
          font-family: Segment;
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 0.03em;
          text-align: left;
        }

        dd {
          color: var(--white);
          font-family: Segment;
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          letter-spacing: 0em;
          text-align: left;
        }

        .row dd {
          text-align: right;
        }

        .rpc_url {
          word-break: break-all;
        }

        footer {
          padding: 16px;
          padding-bottom: 0;
          display: flex;
          justify-content: space-between;
        }
      `}</style>
    </div>
  )
}
