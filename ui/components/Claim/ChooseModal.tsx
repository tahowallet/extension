import React, { Dispatch, ReactElement, SetStateAction } from "react"

interface ModalProps {
  setModalVisible: Dispatch<SetStateAction<boolean>>
}

const delegates = [
  {
    image: "./images/uniswap@2x.png",
    name: "Justin Sun",
    address: "0x0b8A87B2eBa3339cE6234e13F52b28677c8E123D",
  },
  {
    image: "./images/uniswap@2x.png",
    name: "Justin Sun",
    address: "0x0b8A87B2eBa3339cE6234e13F52b28677c8E123D",
  },
  {
    image: "./images/uniswap@2x.png",
    name: "Justin Sun",
    address: "0x0b8A87B2eBa3339cE6234e13F52b28677c8E123D",
  },
  {
    image: "./images/uniswap@2x.png",
    name: "Justin Sun",
    address: "0x0b8A87B2eBa3339cE6234e13F52b28677c8E123D",
  },
]

export default function ChoseDelegateModal({
  setModalVisible,
}: ModalProps): ReactElement {
  return (
    <div className="modal__wrap">
      <img src="./images/dark_forest@2x.png" alt="" className="modal_tree" />
      <div className="modal__content standard_width">
        <div className="modal__title">Choose a delegate!</div>
        <div className="modal__description">
          Copy Select a delegate bellow....And some nicer text about how honest
          they all are.
        </div>
        {delegates.map((delegate) => {
          return (
            <div className="delegate">
              <input type="radio" name="delegate" className="radio" />
              <div className="delegate__details">
                <img src={delegate.image} alt={delegate.name} />
                <div className="delegate__info">
                  <div>{delegate.name}</div>
                  <div>{delegate.address.substring(0, 5)}</div>
                </div>
              </div>
            </div>
          )
        })}
        <button
          className="modal__button"
          type="button"
          onClick={() => setModalVisible(false)}
        >
          Understood
        </button>
      </div>
      <style jsx>{`
        .delegate {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .delegate__details {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .delegate__info {
          display: flex;
          width: 100%;
          justify-content: space-between;
        }
        .radio {
          all: revert;
        }
        .modal__wrap {
          width: 100vw;
          height: 100vh;
          background: linear-gradient(
            0deg,
            rgba(0, 37, 34, 1) 80%,
            rgba(25, 51, 48, 1) 100%
          );
          display: flex;
          position: absolute;
          justify-content: center;
          align-items: center;
          z-index: 3;
          animation-name: slideup;
          animation-duration: 0.4s;
        }
        .modal_tree {
          position: absolute;
          width: 100%;
          top: -50px;
        }
        @keyframes slideup {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0%);
          }
        }
        .modal__content {
          height: 100%;
          padding: 24px;
          z-index: 2;
          position: relative;
          display: flex;
          flex-flow: column;
          gap: 12px;
          border-radius: 12px;
        }
        .modal__title {
          font-family: Quincy CF;
          font-size: 42px;
          line-height: 58px;
          padding-top: 48px;
        }
        .modal__description {
          font-family: Segment;
          font-size: 16px;
          line-height: 24px;
          color: #99a8a7;
        }
        .modal__button {
          height: 40px;
          border-radius: 4px;
          background-color: var(--trophy-gold);
          color: #002522;
          font-size: 20px;
          letter-spacing: 0.48px;
          line-height: 24px;
          text-align: center;
          padding: 0px 17px;
          margin-bottom: 16px;
          margin-right: 8px;
          margin-top: auto;
        }
      `}</style>
    </div>
  )
}
