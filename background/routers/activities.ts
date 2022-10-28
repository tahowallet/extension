import { ActivityDetail } from "../redux-slices/activities"
import { createRoute, createRouter } from "./lib"

const getActivityDetails = createRoute(
  ({ main }) =>
    async (activityHash: string): Promise<ActivityDetail[]> => {
      return main.getActivityDetails(activityHash)
    }
)

export default createRouter("activities", {
  getActivityDetails,
})
