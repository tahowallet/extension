import type { RootState } from "../.."
import { AccountState } from "../../accounts"

const getAccountState = (state: RootState): AccountState => state.account

export default getAccountState
