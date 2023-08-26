import fs from "fs"
import path from "path"
import archiver from "archiver"
import { Compiler, Stats } from "webpack"

const PLUGIN_NAME = "WebextArchive"

type ArchiveOptions = {
  /** The filename for the archive, without a path or extension. */
  filename: string
  /**
   * The path to the output. Defaults to the parent of the webpack config's
   * output path; i.e., if the webpack config outputs to `dist/firefox`, this
   * plugin defaults to `dist/` as the output path.
   */
  outputDirectory?: string
}

/**
 * @return A function that can be tapped into the done hook for Webpack
 *         compilation and generates a ZIP file based on the passed
 *         configuration ArchiveOptions.
 */
function webextArchiveCreator(
  webpackCompiler: Compiler,
  { filename, outputDirectory }: ArchiveOptions,
): (stats: Stats, pluginCompleted: (err: Error | null) => void) => void {
  const logger = webpackCompiler.getInfrastructureLogger(PLUGIN_NAME)
  return (_: Stats, pluginCompleted: (err: Error | null) => void) => {
    const archiveSources = webpackCompiler.outputPath
    const outputPath =
      outputDirectory || path.join(webpackCompiler.outputPath, "..")

    const outputStream = fs.createWriteStream(
      path.join(outputPath, `${filename}.zip`),
    )
    outputStream.on("close", () => {
      pluginCompleted(null)
    })
    outputStream.on("warning", (err) => {
      logger.warn(`While generating archive ${filename}.zip, got: ${err}.`)
    })
    outputStream.on("error", (err) => {
      pluginCompleted(err)
    })

    const archive = archiver("zip", {
      zlib: { level: 9 /* max compression */ },
    })

    archive.pipe(outputStream)
    archive.directory(archiveSources, false)
    archive.finalize()
  }
}

export default class WebextArchive {
  constructor(private options: ArchiveOptions) {}

  apply(compiler: Compiler): void {
    compiler.hooks.done.tapAsync(
      PLUGIN_NAME,
      webextArchiveCreator(compiler, this.options),
    )
  }
}
