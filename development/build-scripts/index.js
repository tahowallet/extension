//
// build task definitions
//
// run any task with "yarn build ${taskName}"
//

const livereload = require('gulp-livereload')
const { createTask, composeSeries, composeParallel, detectAndRunEntryTask } = require('./task')
const createManifestTasks = require('./manifest')
const createScriptTasks = require('./scripts')
const createStaticAssetTasks = require('./static')
const createEtcTasks = require('./etc')

const browserPlatforms = [
  'firefox',
  'chrome',
  'brave',
  'opera',
]

defineAllTasks()
detectAndRunEntryTask()

function defineAllTasks () {

  const staticTasks = createStaticAssetTasks({ livereload, browserPlatforms })
  const manifestTasks = createManifestTasks({ browserPlatforms })
  const scriptTasks = createScriptTasks({ livereload, browserPlatforms })
  const { clean, reload, zip } = createEtcTasks({ livereload, browserPlatforms })

  // build for development (livereload)
  createTask(
    'dev',
    composeSeries(
      clean,
      composeParallel(
        scriptTasks.dev,
        staticTasks.dev,
        manifestTasks.dev,
        reload,
      ),
    ),
  )

  // build for test development (livereload)
  createTask(
    'testDev',
    composeSeries(
      clean,
      composeParallel(
        scriptTasks.testDev,
        staticTasks.dev,
        manifestTasks.testDev,
        reload,
      ),
    ),
  )

  // build for prod release
  createTask(
    'prod',
    composeSeries(
      clean,
      composeParallel(
        scriptTasks.prod,
        staticTasks.prod,
        manifestTasks.prod,
      ),
      zip,
    ),
  )

  // build for CI testing
  createTask(
    'test',
    composeSeries(
      clean,
      composeParallel(
        scriptTasks.test,
        staticTasks.prod,
        manifestTasks.test,
      ),
    ),
  )

  // special build for minimal CI testing

}
