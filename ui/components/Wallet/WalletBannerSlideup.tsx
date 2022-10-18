import {
  setSnackbarMessage,
  toggleHideBanners,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"

export default function WalletBannerSlideup(props: {
  isOpen: boolean
  onClose: () => void
}): ReactElement {
  const { isOpen, onClose } = props
  const dispatch = useBackgroundDispatch()

  const dismiss = () => {
    dispatch(toggleHideBanners(true))
    dispatch(setSnackbarMessage("You can turn notification back from Settings"))
    onClose()
  }
  return (
    <SharedSlideUpMenu
      size="custom"
      customSize="230px"
      isOpen={isOpen}
      close={onClose}
    >
      <div className="wallet_banner_slideup">
        <h3>Odyssey notifications</h3>
        <p>
          Want to receive future Odyssey notifications? We will show you one
          every week that you can dismiss.
        </p>
        <div className="wallet_banner_slideup_buttons">
          <SharedButton type="primary" size="medium" onClick={dismiss}>
            Yes, show notification
          </SharedButton>
          <SharedButton type="tertiary" size="medium" onClick={dismiss}>
            No thanks
          </SharedButton>
        </div>
      </div>
      <style jsx>{`
        h3 {
          color: var(--error);
          font-size: 18px;
          line-height: 24px;
          font-weight: 600;
          margin: 0 0 16px;
        }
        p {
          margin: 0 0 32px;
          color: var(--green-20)
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
        .wallet_banner_slideup {
          margin: 0 24px;
        }
        .wallet_banner_slideup_buttons {
          display: flex;
          justify-content: space-between;
          margin-right: 10px;
        }
      `}</style>
    </SharedSlideUpMenu>
  )
}
