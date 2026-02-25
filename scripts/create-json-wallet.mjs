import { Wallet } from "ethers"
import { createInterface } from "node:readline/promises"

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
})

const wallet = Wallet.createRandom()
async function print() {
  const password = await readline.question("Encrypted wallet JSON Password:\n")

  const json = await wallet.encrypt(password.trim())
  readline.close()
  // oxlint-disable-next-line no-console
  console.log(json)
}

print()
