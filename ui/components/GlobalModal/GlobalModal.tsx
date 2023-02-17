import { WEBSITE_ORIGIN } from "@tallyho/tally-background/constants/website"
import {
  selectShowGlobalModal,
  toggleShowGlobalModal,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedModal from "../Shared/SharedModal"

const IMG = `${WEBSITE_ORIGIN}/hosted/logo_animation.gif`
// TODO update
const LINK = "https://blog.taho.xyz"

export default function GlobalModal(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "globalModal" })

  const showModal = useBackgroundSelector(selectShowGlobalModal)
  const dispatch = useBackgroundDispatch()

  const toggleShowModal = (toggle: boolean) => {
    dispatch(toggleShowGlobalModal(toggle))
  }

  const handleClick = () => {
    toggleShowModal(false)
    window.open(LINK, "_blank")?.focus()
  }

  return (
    <SharedModal
      isOpen={showModal}
      onClose={() => toggleShowModal(false)}
      width="90%"
      minHeight="550px"
      bgColor="var(--green-95)"
      shadowBgColor="var(--green-120)"
    >
      <div className="content">
        <div className="image_wrap">
          <img className="image" src={IMG} alt="" />
        </div>
        <div>
          <span className="title">{t("title")}</span>
          <div className="description">
            <span>{t("description1")}</span>
            <span>{t("description2")}</span>
            <span>{t("description3")}</span>
          </div>
        </div>
        <SharedButton type="primary" size="medium" onClick={handleClick}>
          {t("button")}
        </SharedButton>
      </div>
      <style jsx>{`
        .content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          height: 100%;
          gap: 24px;
          margin-top: 8px;
        }
        .image_wrap {
          align-self: center;
        }
        .image {
          max-width: 100%;
        }
        .title {
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          color: var(--trophy-gold);
        }
        .description {
          margin-top: 16px;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--green-20);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 20px;
        }
      `}</style>
    </SharedModal>
  )
}
