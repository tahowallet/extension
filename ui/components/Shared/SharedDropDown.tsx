import React, { ReactElement, useRef, useState } from "react"
import { useOnClickOutside } from "../../hooks"

type DropdownContextValue = {
  isOpen: boolean
  toggle: (value?: boolean) => void
  styles: React.CSSProperties
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const DropdownContext = React.createContext<DropdownContextValue>(null!)

const useDropdownContext = () => React.useContext(DropdownContext)

type DropdownContainerProps = { children: React.ReactNode }

type TogglerProps = { children: React.ReactNode }

type ContentProps = {
  children:
    | React.ReactNode
    | ((dropDownContext: {
        toggle: DropdownContextValue["toggle"]
      }) => React.ReactNode)
}

function Container({ children }: DropdownContainerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(!false)

  const styles: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: "100%",
    transform: "translateX(calc(-100%)",
    width: "max-content",
    zIndex: 10,
    padding: 0,
    background: "none",
    border: "none",
    display: "block",
  }

  const contextValue: DropdownContextValue = {
    isOpen,
    toggle: (value) => setIsOpen(value ?? ((p) => !p)),
    styles,
  }
  return (
    <DropdownContext.Provider value={contextValue}>
      <div style={{ position: "relative" }}>{children}</div>
    </DropdownContext.Provider>
  )
}

function Toggler({ children }: TogglerProps): ReactElement {
  const { toggle } = useDropdownContext()

  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={() => toggle(true)}
      onKeyUp={() => toggle(true)}
    >
      {children}
    </div>
  )
}

const FadeIn = ({
  isOpen,
  children,
}: {
  isOpen: boolean
  children: React.ReactNode
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen)

  if (isOpen && !shouldRender) {
    setShouldRender(true)
  }

  const styles: React.CSSProperties = {
    transition: "ease-in .1s",
    opacity: isOpen ? 1 : 0,
  }

  return (
    <div
      style={styles}
      onTransitionEnd={() => {
        if (!isOpen) {
          setShouldRender(false)
        }
      }}
    >
      {shouldRender && children}
    </div>
  )
}

function Content({ children }: ContentProps): ReactElement {
  const { isOpen, styles, toggle } = useDropdownContext()

  const wrapperRef = useRef<HTMLDialogElement>(null)

  useOnClickOutside(wrapperRef, () => toggle(false))

  return (
    <FadeIn isOpen={isOpen}>
      <div role="presentation" onClick={(e) => e.stopPropagation()}>
        <dialog ref={wrapperRef} open={isOpen} style={styles}>
          {typeof children === "function" ? children({ toggle }) : children}
        </dialog>
      </div>
    </FadeIn>
  )
}

export default { Container, Toggler, Content }
