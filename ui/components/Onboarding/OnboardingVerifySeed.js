import React, { useState } from 'react';
import SharedButton from '../Shared/SharedButton';
import OnboardingStepsIndicator from './OnboardingStepsIndicator';
import { titleStyle } from './titleStyle';

export default function OnboardingVerifySeed() {
  const [isSelected, setIsSelected] = useState([]);
  const [isNotSelected, setIsNotSelected] = useState(Array(12).fill(''));

  function handleClick() {
    setIsSelected([...isSelected, []]);
    setIsNotSelected(isNotSelected.slice(1));
  }

  return (
    <section>
      <OnboardingStepsIndicator activeStep={2} />
      <h1 className="serif_header center_text title">
        Save and store your recovery seed
      </h1>
      <div className="subtitle">
        This is the only way to restore your tally wallett
      </div>
      <ul className="standard_width button_group center_horizontal">
        {isSelected.map((item, index) => (
          <li className="button_spacing">
            <SharedButton
              type="specialDisabledWhite"
              size="small"
              label={`${index + 1} - cat`}
              onClick={handleClick}
              icon="close"
              isDisabled
            />
          </li>
        ))}
      </ul>
      <ul className="standard_width button_group center_horizontal bottom">
        {isNotSelected.length === 0 ? (
          <span>Congratulations!</span>
        ) : (
          isNotSelected.map(() => (
            <li className="button_spacing">
              <SharedButton
                type="primary"
                size="small"
                label="cat"
                onClick={handleClick}
              />
            </li>
          ))
        )}
      </ul>
      <style jsx>
        {`
          ${titleStyle}
          .button_group {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
          }
          .button_spacing {
            margin-right: 8px;
            margin-bottom: 8px;
          }
          .bottom {
            height: 160px;
            position: absolute;
            bottom: 0px;
          }
        `}
      </style>
    </section>
  );
}
