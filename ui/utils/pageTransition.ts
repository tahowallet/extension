import { RouteComponentProps } from "react-router-dom"
import tabs from "./tabs"

export default function getAnimationDirection(
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
  }
): "right" | "left" | "none" {
  const { entries } = routeProps.history
  const locationName = routeProps.location.pathname.split("/")[1]
  const prevLocationName =
    (entries &&
      entries[entries.length - 2] &&
      entries[entries.length - 2].pathname.split("/")[1]) ||
    ""

  const isGoingBetweenTabs =
    tabs.includes(locationName) && tabs.includes(prevLocationName)

  const isGoingToATabLeftOfTab =
    tabs.includes(locationName) &&
    tabs.indexOf(locationName) < tabs.indexOf(prevLocationName)

  const isGoingBack =
    entries &&
    entries[entries.length - 1] &&
    entries[entries.length - 1]?.state?.isBack === true

  // Note that these directions are the *animation* directions, which are
  // opposite of the spatial direction that the content is moving.
  if (isGoingBack || (isGoingBetweenTabs && isGoingToATabLeftOfTab)) {
    return "right"
  }
  return "left"
}

export function animationStyles(): string {
  return `
      .page-transition-enter .anti_animation {
        transform: ${
          /*! isDirectionRight */ false ? `translateX(-7px)` : `translateX(7px)`
        };
      }
      .page-transition-enter-active .anti_animation {
        transform: translateX(0px);
        transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms;
      }
      .page-transition-exit .anti_animation {
        transform: translateX(0px);
      }
      .page-transition-exit-active .anti_animation {
        opacity: 1;
        transform: ${
          /*! isDirectionRight */ false ? `translateX(-7px)` : `translateX(7px)`
        };
        transition: transform cubic-bezier(0.25, 0.4, 0.55, 1.4) 250ms;
      }
      `
}
