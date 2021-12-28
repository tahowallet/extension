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
  pagePreferences: {
    [path: string]: {
      hasTabBar: boolean
      hasTopBar: boolean
    }
  },
  setShouldDisplayDecoy: (choice: boolean) => void,
  setIsDirectionRight: (choice: boolean) => void
): void {
  const { entries } = routeProps.history
  const locationName = routeProps.location.pathname.split("/")[1]
  const prevLocationName =
    (entries &&
      entries[entries.length - 2] &&
      entries[entries.length - 2].pathname.split("/")[1]) ||
    ""

  const isDecoyNeeded =
    pagePreferences[`/${prevLocationName === "wallet" ? "" : prevLocationName}`]
      ?.hasTopBar &&
    pagePreferences[`/${locationName === "wallet" ? "" : locationName}`]
      ?.hasTopBar
  setShouldDisplayDecoy(isDecoyNeeded)

  const isGoingBetweenTabs =
    tabs.includes(locationName) && tabs.includes(prevLocationName)

  const isGoingToATabLeftOfTab =
    tabs.includes(locationName) &&
    tabs.indexOf(locationName) < tabs.indexOf(prevLocationName)

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

export function animationStyles(
  shouldDisplayDecoy: boolean,
  isDirectionRight: boolean
): string {
  return `
      .top_menu_wrap_decoy {
        position: absolute;
        top: -6px;
        left: 0px;
        right: 0px;
        margin: 0 auto;
        width: max-content;
        z-index: -1;
        opacity: ${!shouldDisplayDecoy ? "0" : "1"};
      }

      .page-transition-enter {
        opacity: 0.3;
        transform: ${isDirectionRight ? `translateX(-7px)` : `translateX(7px)`};
      }
      .page-transition-enter-active {
        opacity: 1;
        transform: translateX(0px);
        transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms,
          opacity 250ms;
      }
      .page-transition-exit {
        opacity: 1;
        transform: translateX(0px);
      }
      .page-transition-exit-active {
        opacity: 0;
        transform: ${isDirectionRight ? `translateX(-7px)` : `translateX(7px)`};
        transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms,
          opacity 250ms;
      }

      .page-transition-enter .anti_animation {
        transform: ${
          !isDirectionRight ? `translateX(-7px)` : `translateX(7px)`
        };
      }
      .page-transition-enter-active .anti_animation {
        transform: translateX(0px);
        transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms;
      }
      .page-transition-exit .anti_animation {
        transform: translateX(0px);
        background-color: red;
      }
      .page-transition-exit-active .anti_animation {
        opacity: 1;
        transform: ${
          !isDirectionRight ? `translateX(-7px)` : `translateX(7px)`
        };
        transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms;
      }
      `
}
