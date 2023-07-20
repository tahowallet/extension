/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs")
const wallet = require("ethereumjs-wallet").default

const pk = Buffer.from(
  process.env.PRIVATE_KEY, // should not contrain `0x` prefix
  "hex"
)
const account = wallet.fromPrivateKey(pk)
const password = process.env.PASSWORD
account.toV3(password).then((value) => {
  const address = account.getAddress().toString("hex")
  const file = `UTC--${new Date()
    .toISOString()
    .replace(/[:]/g, "-")}--${address}.json`
  fs.writeFileSync(file, JSON.stringify(value))
})
