import { RouteComponentProps } from "react-router-dom"
import tabs from "./tabs"

export default function setAnimationConditions(
  routeProps: RouteComponentProps & {
    history?: {
      entries?: {
        state: {
          isBack: boolean
        }
        pathname: string
      }[]
    }
    location?: {
      pathname: string
    }
  },
  setIsDirectionRight: (choice: boolean) => void,
): void {
  const { entries } = routeProps.history
  const locationName = routeProps.location.pathname.split("/")[1]
  const prevLocationName =
    (entries &&
      entries[entries.length - 2] &&
      entries[entries.length - 2].pathname.split("/")[1]) ||
    ""

  const tabRoutes = tabs.map((tab) => tab.path)

  const isGoingBetweenTabs =
    tabRoutes.includes(locationName) && tabRoutes.includes(prevLocationName)

  const isGoingToATabLeftOfTab =
    tabRoutes.includes(locationName) &&
    tabRoutes.indexOf(locationName) < tabRoutes.indexOf(prevLocationName)

  const isGoingBack =
    entries &&
    entries[entries.length - 1] &&
    entries[entries.length - 1]?.state?.isBack === true

  if (isGoingBack) {
    setIsDirectionRight(true)
  } else if (isGoingBetweenTabs) {
    if (isGoingToATabLeftOfTab) {
      setIsDirectionRight(true)
    } else if (!isGoingToATabLeftOfTab) {
      setIsDirectionRight(false)
    }
  } else {
    setIsDirectionRight(false)
  }
}

export function animationStyles(isDirectionRight: boolean): string {
  return `
      .page-transition-enter > section > main {
        opacity: 0.3;
        transform: ${isDirectionRight ? "translateX(-7px)" : "translateX(7px)"};
      }
      .page-transition-enter-active > section > main {
        opacity: 1;
        transform: translateX(0px);
        transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms,
          opacity 250ms;
      }
      .page-transition-exit {
        opacity: 1;
      }
      .page-transition-exit-active {
        opacity: 0;
      }
      `
}
