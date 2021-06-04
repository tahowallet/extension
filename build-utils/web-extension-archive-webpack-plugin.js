// @ts-check

const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

/** @typedef { import("webpack").Compiler } WebpackCompiler */
/** @typedef { import("webpack").Stats } WebpackStats */

/**
 * @typedef {Object} ArchiveOptions
 * @property {string} filename The filename for the archive, without a path or
 *            extension.
 * @property {string?} outputDirectory The path to the output. Defaults to the
 *           parent of the webpack config's output path; i.e., if the webpack
 *           config outputs to `dist/firefox`, this plugin defaults to `dist/`
 *           as the output path.
 */

/**
 * @param {WebpackCompiler} webpackCompiler
 * @param {ArchiveOptions} options
 *
 * @return {(stats: WebpackStats, pluginCompleted: (err: Error)=>void)=>void}
 */
function webextArchiveCreator(webpackCompiler, { filename, outputDirectory }) {
  return (_, pluginCompleted) => {
    const archiveSources = webpackCompiler.outputPath
    const outputPath = outputDirectory || path.join(webpackCompiler.outputPath, '..')
  
    const outputStream = fs.createWriteStream(path.join(outputPath, filename + ".zip"))
    outputStream.on('close', () => {
      pluginCompleted(null)
    })
    outputStream.on('warning', (err) => {
      console.warn(
        `While generating archive ${filename}.zip, got: ${err}.`
      )
    })
    outputStream.on('error', (err) => {
      pluginCompleted(err)
    })

    const archive = archiver(
      'zip',{
        zlib: { level: 9 /* max compression */ }
      }
    )

    archive.pipe(outputStream)
    archive.directory(archiveSources, false)
    archive.finalize()
  }
}

/** @type {(options: ArchiveOptions) => (compiler: WebpackCompiler)=>void} */
module.exports = function WebextArchive(options) {
  return (/** @type {WebpackCompiler} */ compiler) => {
    compiler.hooks.done.tapAsync(
      'WebextArchive',
      webextArchiveCreator(compiler, options)
    )
  }
}
