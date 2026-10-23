import { ChildProcess, spawn } from "child_process"
import path from "path"

export type FakeRpcMode = "answering" | "hanging" | "refusing"

const SERVER_SCRIPT = path.resolve(__dirname, "../fake-rpc-server.ts")
const READY_PREFIX = "fake-rpc listening "

/**
 * A handle on the fake JSON-RPC endpoint, run as a Bun child process.
 *
 * The process picks its own port and prints it, so nothing here guesses or
 * sleeps and parallel workers cannot collide.
 */
export default class FakeRpc {
  private constructor(
    private process: ChildProcess,
    /** The URL to hand to the wallet as an RPC endpoint. */
    public readonly url: string,
  ) {}

  static async start(chainID: string): Promise<FakeRpc> {
    const child = spawn("bun", [SERVER_SCRIPT, chainID], {
      stdio: ["ignore", "pipe", "pipe"],
    })

    const url = await new Promise<string>((resolve, reject) => {
      let output = ""

      const onData = (chunk: Buffer) => {
        output += chunk.toString()
        const line = output
          .split("\n")
          .find((candidate) => candidate.startsWith(READY_PREFIX))

        if (line !== undefined) {
          resolve(line.slice(READY_PREFIX.length).trim())
        }
      }

      child.stdout?.on("data", onData)
      child.stderr?.on("data", onData)
      child.on("error", reject)
      child.on("exit", (code) =>
        reject(
          new Error(`fake RPC server exited with ${code} before listening`),
        ),
      )
    })

    return new FakeRpc(child, url)
  }

  /** Stop answering, or start again. */
  async setMode(mode: FakeRpcMode): Promise<void> {
    await this.control({ mode })
  }

  /** Claim to serve a different chain than the one it was started for. */
  async setChainID(chainID: string): Promise<void> {
    await this.control({ chainId: chainID })
  }

  async stop(): Promise<void> {
    if (this.process.exitCode !== null || this.process.signalCode !== null) {
      return
    }

    const exited = new Promise<void>((resolve) => {
      this.process.on("exit", () => resolve())
    })
    this.process.kill("SIGKILL")
    await exited
  }

  private async control(body: {
    mode?: FakeRpcMode
    chainId?: string
  }): Promise<void> {
    const response = await fetch(`${this.url}/__control`, {
      method: "POST",
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`fake RPC server rejected control: ${response.status}`)
    }
  }
}
