import React, { useState } from 'react';
import OnboardingImportMetamask from '../components/Onboarding/OnboardingImportMetamask';
import OnboardingCreatePassword from '../components/Onboarding/OnboardingCreatePassword';
import OnboardingVerifySeed from '../components/Onboarding/OnboardingVerifySeed';
import OnboardingSaveSeed from '../components/Onboarding/OnboardingSaveSeed';
import OnboardingStartTheHunt from '../components/Onboarding/OnboardingStartTheHunt';
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
        <OnboardingStartTheHunt
          openNewWalletScreen={() => {
            setStep(2);
          }}
          openMetamaskImportScreen={() => {
            setStep(4);
          }}
        />
      )}
      {step === 2 && (
        <OnboardingSaveSeed
          triggerNextStep={() => {
            setStep(step + 1);
          }}
        />
      )}
      {step === 3 && (
        <OnboardingVerifySeed
          triggerNextStep={() => {
            setStep(step + 1);
          }}
          triggerPreviousStep={() => {
            setStep(step - 1);
          }}
        />
      )}
      {step === 4 && (
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
