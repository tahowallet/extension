import { createContext, useContext } from "react"

/**
 * A context that is `true` when a popup page is rendered inside the full-tab
 * view. The full-tab view supplies its own navigation, so embedded pages leave
 * out the popup's top and tab bars.
 */
const EmbeddedPageContext = createContext(false)

export const useIsEmbeddedPage = (): boolean => useContext(EmbeddedPageContext)

export default EmbeddedPageContext
