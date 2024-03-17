const absPath = require('../src/shared/absPath.cjs')
const syncFs = require('../src/shared/syncFs.cjs')
const { errorSection} = require('../src/shared/console.cjs')
const { d } = require('../src/shared/helper.cjs')
const { runPostBuildProcessing } = require('../src/build/build.cjs')

const paramsPath = absPath.tmp('post-build-params.json')

if (syncFs.fileExists(paramsPath)) {
    runPostBuildProcessing(syncFs.readJson(paramsPath))
        .catch(e => errorSection(e, 'BUILD'))
        .finally(() => syncFs.clearDir(absPath.tmp()))
}