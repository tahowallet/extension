import { Compilation, Compiler, sources } from "webpack"

const PLUGIN_NAME = "RuntimeDefine"
const WINDOW_PROVIDER_FILENAME = "window-provider.js"
const PROVIDER_BRIDGE_FILENAME = "provider-bridge.js"

export default class InjectWindowProvider {
  // eslint-disable-next-line class-methods-use-this
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(
      PLUGIN_NAME,
      (compilation: Compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
          },
          (assets) => {
            let windowProviderSource =
              assets[WINDOW_PROVIDER_FILENAME].source().toString()

            // Insert assets for injected UI
            const fontAsB64 = assets["fonts/segment-medium.woff2"]
              .source()
              .toString("base64")

            windowProviderSource = windowProviderSource.replace(
              "@@@SEGMENT_MEDIUM_BASE64@@@",
              fontAsB64,
            )

            // need to encode so it can be used as a string
            // in non optimised builds the source is a multi line string > `` needs to be used
            // but ${ needs to be escaped separatly otherwise it breaks the ``
            windowProviderSource = JSON.stringify(windowProviderSource)
            const providerBridgeSource =
              assets[PROVIDER_BRIDGE_FILENAME].source().toString()

            // eslint-disable-next-line no-param-reassign
            assets[PROVIDER_BRIDGE_FILENAME] = new sources.RawSource(
              providerBridgeSource.replace(
                // eslint-disable-next-line no-useless-escape
                '"@@@WINDOW_PROVIDER@@@"',
                windowProviderSource,
              ),
            )

            // eslint-disable-next-line no-param-reassign
            delete assets[WINDOW_PROVIDER_FILENAME]
            // eslint-disable-next-line no-param-reassign
            delete assets[`${WINDOW_PROVIDER_FILENAME}.map`]
          },
        )
      },
    )
  }
}
