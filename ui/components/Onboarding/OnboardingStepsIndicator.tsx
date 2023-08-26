import React, { ReactElement } from "react"
import classNames from "classnames"
import { useTranslation } from "react-i18next"

interface OnboardingStepProps {
  label: string
  isActive: boolean
}

function OnboardingStep(props: OnboardingStepProps): ReactElement {
  const { label, isActive } = props

  return (
    <li className={classNames({ active: isActive })}>
      {label}
      <style jsx>
        {`
          li:before {
            content: " ";
            display: block;
            width: 6px;
            height: 6px;
            border-radius: 100px;
            background-color: var(--green-60);
          }
          li {
            display: block;
            color: var(--green-60);
            font-size: 16px;
            font-weight: 500;
            line-height: 24px;
            text-align: center;
            display: flex;
            align-items: center;
            flex-direction: column;
            padding: 0px 11px;
          }
          .active {
            color: var(--trophy-gold);
          }
          .active:before {
            background-color: var(--trophy-gold);
            width: 16px;
          }
        `}
      </style>
    </li>
  )
}

OnboardingStep.defaultProps = {
  isActive: false,
}

interface OnboardingStepsIndicatorProps {
  activeStep: number
}

export default function OnboardingStepsIndicator(
  props: OnboardingStepsIndicatorProps,
): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "onboarding.steps" })
  const { activeStep } = props

  return (
    <ul>
      <OnboardingStep label={t("create")} isActive={activeStep === 0} />
      <OnboardingStep label={t("save")} isActive={activeStep === 1} />
      <OnboardingStep label={t("verify")} isActive={activeStep === 2} />
      <style jsx>
        {`
          ul {
            display: flex;
          }
        `}
      </style>
    </ul>
  )
}
