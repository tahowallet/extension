import { isAllowedQueryParamPage } from "@tallyho/provider-bridge-shared"

import { useState, useEffect, ReactElement, ReactNode } from "react"
import { getAllAddresses } from "@tallyho/tally-background/redux-slices/selectors/accountsSelectors"
import SharedPanelSwitcher from "../components/Shared/SharedPanelSwitcher"
import { useBackgroundSelector } from "./redux-hooks"

export * from "./redux-hooks"
export * from "./signing-hooks"
export * from "./dom-hooks"
export * from "./validation-hooks"
export * from "./nft-hooks"

export function useIsDappPopup(): boolean {
  const [isDappPopup, setIsDappPopup] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const maybePage = params.get("page")

    if (isAllowedQueryParamPage(maybePage)) {
      setIsDappPopup(true)
    } else {
      setIsDappPopup(false)
    }
  }, [])

  return isDappPopup
}

/**
 * Used to describe a panel for useSwitchablePanels.
 */
type PanelDescriptor = {
  name: string
  panelElement: () => ReactElement
}

/**
 * useSwitchablePanels creates a tabbed panel switcher that can be used to
 * interchange between several screens exclusively from each other.
 *
 * The underlying component is a `SharedPanelSwitcher`, and the hook returns
 * the switcher element and current panel being displayed as siblings for
 * adding to a JSX component.
 *
 * @example
 * ```
 * const switchablePanels = useSwitchablePanels([
 *   {
 *     name: "Details",
 *     panelElement: () => (
 *       <SigningDataTransactionDetailPanel
 *         transactionRequest={transactionRequest}
 *       />
 *     ),
 *   },
 *   {
 *     name: "Raw data",
 *     panelElement: () => (
 *       <SigningDataTransactionRawDataPanel
 *         transactionRequest={transactionRequest}
 *       />
 *     ),
 *   },
 * ])

 * return <>{switchablePanels}</>
 * ```
 */
export function useSwitchablePanels(panels: PanelDescriptor[]): ReactNode {
  const [panelNumber, setPanelNumber] = useState(0)

  return [
    SharedPanelSwitcher({
      setPanelNumber,
      panelNumber,
      panelNames: panels.map(({ name }) => name),
    }),
    panels[panelNumber].panelElement(),
  ]
}

export function useIsOnboarding(): boolean {
  return useBackgroundSelector(getAllAddresses).length < 1
}
