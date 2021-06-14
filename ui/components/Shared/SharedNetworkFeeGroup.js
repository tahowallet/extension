import React, { useState } from 'react';
import SharedFeeSelectButton from './SharedFeeSelectButton';

export default function SharedNetworkFeeGroup() {
  const [selectedFee, setSelectedFee] = useState(0);

  return (
    <>
      <div className="network_fee_group">
        <div className="network_fee_button">
          <SharedFeeSelectButton
            isActive={selectedFee === 0 && true}
            onClick={() => {
              setSelectedFee(0);
            }}
          />
        </div>
        <div className="network_fee_button">
          <SharedFeeSelectButton
            isActive={selectedFee === 1 && true}
            onClick={() => {
              setSelectedFee(1);
            }}
          />
        </div>
        <div className="network_fee_button">
          <SharedFeeSelectButton
            isActive={selectedFee === 2 && true}
            onClick={() => {
              setSelectedFee(2);
            }}
          />
        </div>
      </div>
      <style jsx>
        {`
          .network_fee_group {
            display: flex;
            margin-bottom: 29px;
          }
          .network_fee_button {
            margin-right: 16px;
          }
        `}
      </style>
    </>
  );
}
