import type mainRouter from "@tallyho/tally-background/routers"
import { buildRequestSender } from "@tallyho/tally-background/routers/lib"

const sendRequest = buildRequestSender<typeof mainRouter>()

export default sendRequest
