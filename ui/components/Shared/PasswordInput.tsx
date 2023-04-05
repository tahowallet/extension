import React, { ComponentProps, ReactElement, useState } from "react"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import SharedInput from "./SharedInput"
import { Simplify } from "./types"

type PasswordInputProps = Simplify<
  { hasPreview?: boolean } & Omit<ComponentProps<typeof SharedInput>, "type">
>

export default function PasswordInput(props: PasswordInputProps): ReactElement {
  const { hasPreview = true, ...inputProps } = props
  const [showPassword, setShowPassword] = useState(false)
  const passwordInputType = showPassword ? "text" : "password"
  const { t } = useTranslation("translation", { keyPrefix: "shared" })

  return (
    <div className="wrapper">
      <SharedInput
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...inputProps}
        type={passwordInputType}
      />
      {hasPreview && (
        <button
          role="switch"
          type="button"
          aria-label={
            !showPassword ? t("showPasswordHint") : t("hidePasswordHint")
          }
          aria-checked={showPassword}
          onClick={() => setShowPassword((visible) => !visible)}
          className={classNames("icon icon_medium", {
            active: showPassword,
          })}
        />
      )}
      <style jsx>
        {`
          .wrapper > :global(input) {
            padding-right: 40px;
          }
          .wrapper {
            position: relative;
            width: 100%;
          }
          .icon {
            position: absolute;
            top: 0;
            bottom: 0;
            right: 0;
            margin-right: 16px;
            height: 16px;
            width: 16px;
            mask-image: url("./images/icons/s/eye-on.svg");
            mask-size: cover;
            background-position: center;
            background-color: var(--green-60);
            background-size: 16px;
            transition: all 0.12s ease-out;
            transform: translateY(50%);
          }
          .icon.active {
            background-color: var(--trophy-gold);
          }
          .icon_medium {
            mask-image: url("./images/icons/m/eye-on.svg");
            mask-size: cover;
            width: 24px;
            height: 24px;
            background-size: 24px;
          }
        `}
      </style>
    </div>
  )
}

const { type: _, ...defaultProps } = SharedInput.defaultProps
PasswordInput.defaultProps = defaultProps
