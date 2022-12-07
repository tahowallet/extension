import { createWallet, tallyHoTest } from "./utils"

tallyHoTest("Create wallet", async ({ page, extensionId }) => {
  await createWallet(page, extensionId)
})
