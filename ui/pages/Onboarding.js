import React, { useState } from 'react';
import OnboardingImportMetamask from '../components/Onboarding/OnboardingImportMetamask';
import OnboardingCreatePassword from '../components/Onboarding/OnboardingCreatePassword';
import OnboardingVerifySeed from '../components/Onboarding/OnboardingVerifySeed';
import OnboardingSaveSeed from '../components/Onboarding/OnboardingSaveSeed';
import { registerRoute } from '../config/routes';

export default function Onboarding() {
  const [step, setStep] = useState(0);

  return (
    <>
      {step === 0 && (
        <OnboardingCreatePassword
          triggerNextStep={() => {
            setStep(step + 1);
          }}
        />
      )}
      {step === 1 && (
        <OnboardingSaveSeed
          triggerNextStep={() => {
            setStep(step + 1);
          }}
        />
      )}
      {step === 2 && (
        <OnboardingVerifySeed
          triggerNextStep={() => {
            setStep(step + 1);
          }}
        />
      )}
      {step === 3 && (
        <OnboardingImportMetamask
          triggerNextStep={() => {
            setStep(step + 1);
          }}
        />
      )}
    </>
  );
}

registerRoute('onboarding', Onboarding);
