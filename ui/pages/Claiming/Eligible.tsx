import { selectAccountAndTimestampedActivities } from "@tallyho/tally-background/redux-slices/accounts"
import React, { ReactElement, useEffect, useState } from "react"
import { Redirect } from "react-router-dom"
import SharedButton from "../../components/Shared/SharedButton"
import SharedInput from "../../components/Shared/SharedInput"
import { useBackgroundSelector } from "../../hooks"

export default function Eligible(): ReactElement {
  const [account, setAccount] = useState("")
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)
  const { accountData } = useBackgroundSelector(
    selectAccountAndTimestampedActivities
  )

  useEffect(() => {
    if (Object.keys(accountData)) {
      setAccount(Object.keys(accountData)[0])
    }
  }, [accountData])

  if (Object.keys(accountData).length === 0) {
    return <Redirect to="/overview" />
  }

  const alreadyClaimedAddresses: string[] = []
  const claim = () => {
    alreadyClaimedAddresses.push(account)
    setAlreadyClaimed(true)

    // console.log(claimTally())
    // await claimTally()
  }

  return (
    <div className="wrap">
      <h3>Claim for account:</h3>
      <h4>{account.substring(0, 10).concat("...")}</h4>
      <SharedInput placeholder="Referrer address" />
      <a href="/" className="link">
        Where can I find that?
      </a>
      <div className="wrap__claim-button">
        <SharedButton
          size="medium"
          type="primary"
          onClick={claim}
          isDisabled={alreadyClaimed}
        >
          {alreadyClaimed ? "Already Claimed" : "Claim and Delegate"}
        </SharedButton>
      </div>
      <style jsx>
        {`
          .wrap {
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          .wrap__claim-button {
            padding: 16px;
          }
          .link {
            color: var(--trophy-gold);
          }
        `}
      </style>
    </div>
  )
}
