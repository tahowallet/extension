import React from 'react';
import PropTypes from 'prop-types';
import SharedButton from '../Shared/SharedButton';

export default function SwapApprovalStep(props) {
  const { isDone, label } = props;

  return (
    <>
      <div className="wrap">
        <div className="left">
          <div className={`icon_check${isDone ? ' icon_green' : ''}`} />
          {label}
        </div>
        <SharedButton
          type="tertiary"
          size="medium"
          label="Etherscan"
          icon="external"
          iconSize="large"
          isDisabled={!isDone}
        />
      </div>
      <style jsx>
        {`
          .wrap {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 24px;
            color: var(--green-40);
            font-family: Segment;
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
          }
          .icon_check {
            mask-image: url('./images/check@2x.png');
            mask-size: 12px 12px;
            width: 12px;
            height: 12px;
            margin-right: 8px;
            background-color: var(--green-60);
          }
          .icon_green {
            background-color: #22c480;
          }
          .left {
            display: flex;
            align-items: center;
          }
        `}
      </style>
    </>
  );
}

SwapApprovalStep.propTypes = {
  isDone: PropTypes.bool,
  label: PropTypes.string.isRequired,
};

SwapApprovalStep.defaultProps = {
  isDone: false,
};
