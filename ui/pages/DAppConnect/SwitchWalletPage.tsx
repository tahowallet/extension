import { setNewDefaultWalletValue } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useCallback, useEffect } from "react"
import { useDispatch } from "react-redux"
import SharedButton from "../../components/Shared/SharedButton"
import SharedToggleButton from "../../components/Shared/SharedToggleButton"

export default function SwitchWalletPage({
  close,
}: {
  close: () => Promise<void>
}): ReactElement {
  const dispatch = useDispatch()

  const toggleDefaultWallet = useCallback(
    (defaultWalletValue: boolean) =>
      dispatch(setNewDefaultWalletValue(defaultWalletValue)),
    [dispatch]
  )

  useEffect(() => {
    toggleDefaultWallet(false)
  }, [toggleDefaultWallet])

  return (
    <div className="page">
      <section className="standard_width">
        <h1 className="serif_header">Tally Ho not Default</h1>
        <p>
          We disabled Tally as default wallet for you. You can always enable it
          back from Menu ☰ at any time.
        </p>
        <div className="toggle_default">
          <span>Use Tally Ho as default wallet</span>
          <SharedToggleButton
            onChange={(value) => toggleDefaultWallet(value)}
            value={false}
          />
        </div>
        <div className="button_wrap">
          <SharedButton type="primary" size="large" onClick={close}>
            Close window
          </SharedButton>
        </div>
      </section>

      <style jsx>{`
        .page {
          background-color: var(--green-95);
          height: 100vh;
          width: 100vw;
          z-index: 1000;
          color: var(--green-20);
        }
        section {
          display: flex;
          flex-direction: column;
          height: 100vh;
          margin: 0 auto;
        }
        h1 {
          color: var(--trophy-gold);
          margin-top: 45px;
          margin-bottom: 25px;
          text-align: center;
        }
        p {
          text-align: center;
          font-size: 16px;
          line-height: 24px;
          font-weight: 500;
          width: 335px;
          margin: 0 0 37px;
        }
        .toggle_default {
          background: var(--hunter-green);
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 8px;
          padding: 13px 16px;
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          margin-bottom: 53px;
        }
        .button_wrap {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}
