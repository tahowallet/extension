import { createWallet, test } from "./utils"

test("Create wallet", async ({ page, extensionId }) => {
  await createWallet(page, extensionId)
})
