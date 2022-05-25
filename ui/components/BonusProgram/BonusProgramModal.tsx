import React, { ReactElement, useCallback, useMemo } from "react"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import { selectReferrerStats } from "@tallyho/tally-background/redux-slices/claim"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { DOGGO } from "@tallyho/tally-background/constants"
import { WEBSITE_ORIGIN } from "@tallyho/tally-background/constants/website"
import { fromFixedPointNumber } from "@tallyho/tally-background/lib/fixed-point"
import SharedTwitterButton from "../Shared/SharedTwitterButton"
import SharedButton from "../Shared/SharedButton"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"

function BonusProgramModalContent(): ReactElement {
  const dispatch = useBackgroundDispatch()
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const { referredUsers, bonusTotal } =
    useBackgroundSelector(selectReferrerStats)
  const bonusAmount = fromFixedPointNumber(
    {
      amount: bonusTotal,
      decimals: DOGGO.decimals,
    },
    2
  )

  const referralLink = useMemo(
    () => ({
      link: `${WEBSITE_ORIGIN}/claim/${currentAccount.address}`,
      shortLink: `${WEBSITE_ORIGIN?.replace(
        /^https?:\/\//,
        ""
      )}/claim/${truncateAddress(currentAccount.address)}`,
    }),
    [currentAccount.address]
  )

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(referralLink.link)
    dispatch(setSnackbarMessage("Link copied to clipboard"))
  }, [referralLink, dispatch])

  return (
    <div className="standard_width wrap">
      <h1>Rewards program</h1>
      <div className="banner">
        <div>
          <img src="./images/claim@2x.png" alt="" />
        </div>
        <div className="claimable">
          <div className="claimable_info">Total bonus received so far</div>
          <div className="claimable_row">
            <div className="claimable_column">
              <div className="amount">{bonusAmount}</div>
              <div className="claimable_item">DOGGO</div>
            </div>
            <div className="claimable_column">
              <div className="amount">{referredUsers}</div>
              <div className="claimable_item">Users</div>
            </div>
          </div>
        </div>
      </div>
      <h2>Share to receive 5%</h2>
      <p>
        Everytime somebody claims their tokens using your link, you each get 5%
        of the claim.{" "}
        <a
          className="rewards_link"
          href={`${WEBSITE_ORIGIN}/rewards`}
          target="_blank"
          rel="noreferrer"
        >
          Read more
        </a>
      </p>
      <div className="link_cta_wrap">
        <div className="link_line">
          <span className="link_title">Your link:</span>
          <span className="link" title={referralLink.shortLink}>
            {referralLink.shortLink}
          </span>
        </div>
        <div className="bottom">
          <SharedTwitterButton
            link={referralLink.link}
            text="Get an extra 5% bonus on your $DOGGO claim when you use this link (🐶, 🐶)"
          />
          <SharedButton
            type="secondary"
            size="medium"
            iconSmall="copy"
            iconPosition="left"
            onClick={copyLink}
          >
            Copy to clipboard
          </SharedButton>
        </div>
      </div>
      <div className="public_notice">
        <div className="icon_eye" />
        Address will be visible in the link
      </div>
      <style jsx>
        {`
          .wrap {
            margin: 0 auto;
            margin-top: -25px;
          }
          h1 {
            color: var(--green-5);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .banner {
            width: 100%;
            border-radius: 12px;
            display: flex;
            padding: 0 4px;
            box-sizing: border-box;
            justify-content: space-between;
            align-items: center;
            padding: 0 17px;
            height: 96px;
            margin: 20px 0 8px 0;
            background-color: var(--hunter-green);
          }
          img {
            width: 89px;
            height: 69.9px;
            position: relative;
            top: -4px;
            margin: 0 10px 0 -3px;
          }
          .amount {
            font-family: Quincy CF;
            font-size: 36px;
            color: var(--success);
            margin-bottom: -4px;
            margin-top: -2px;
          }
          .claimable {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: var(--green-40);
            font-weight: 500;
            text-align: center;
            width: 100%;
          }
          .claimable_row {
            width: 100%;
            display: flex;
            justify-content: space-evenly;
          }
          .claimable_info {
            font-size: 14px;
            margin-bottom: 5px;
          }
          h2 {
            color: var(--green-20);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          p {
            width: 321px;
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            margin-top: -10px;
          }
          .link_cta_wrap {
            width: 352px;
            height: 110px;
            border-radius: 12px;
            border: 1px solid var(--green-80);
            padding: 16px;
            box-sizing: border-box;
          }
          .link_line {
            display: flex;
          }
          .link_title {
            flex: 0 0 auto;
            margin-right: 5px;
          }
          .link {
            color: var(--green-40);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .bottom {
            display: flex;
            justify-content: space-between;
            margin-top: 16px;
          }
          .public_notice {
            width: 352px;
            height: 40px;
            border-radius: 8px;
            background-color: var(--green-120);
            display: flex;
            align-items: center;
            padding: 12px;
            box-sizing: border-box;
            margin-top: 24px;
          }
          .icon_eye {
            background: url("./images/eye@2x.png");
            background-size: 24px 24px;
            width: 24px;
            height: 24px;
            margin-right: 5px;
          }
          .rewards_link {
            color: var(--trophy-gold);
          }
        `}
      </style>
    </div>
  )
}

export default function BonusProgramModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}): ReactElement {
  return (
    <SharedSlideUpMenu
      isOpen={isOpen}
      close={onClose}
      size="custom"
      customSize="497px"
    >
      <BonusProgramModalContent />
    </SharedSlideUpMenu>
  )
}
