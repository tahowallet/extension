import React from 'react';

export default function TopMenuProtocolSwitcher() {
  return (
    <button>
      Ethereum
      <span className="icon_chevron_down" />
      <style jsx>
        {`
          button {
            color: var(--green-40);
            display: flex;
            align-items: center;
            cursor: pointer;
          }
          .icon_chevron_down {
            background: url('./images/chevron_down.svg');
            background-size: 15px 8px;
            width: 15px;
            height: 8px;
            margin-left: 7px;
            margin-top: 2px;
          }
        `}
      </style>
    </button>
  );
}
