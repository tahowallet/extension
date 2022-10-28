import activities from "./activities"
import { combineRouters } from "./lib"

const mainRouter = combineRouters(activities)

export default mainRouter
