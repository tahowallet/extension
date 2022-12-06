import { createWallet, tallyHoTest } from "./utils"

tallyHoTest("Create wallet", async ({ page, context, extensionId }) => {
  await createWallet(page, extensionId)
})
