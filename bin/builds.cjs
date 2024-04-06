const { execSync} = require("child_process")
const absPath = require("../src/shared/absPath.cjs")
const { extractOptionsAndArguments, log, bold, errorSection, ERROR_STATUS_HANDLED, setCliScript} = require("../src/shared/console.cjs");
const { argInfoGame} = require("../src/build/helper.cjs");

try {
    setCliScript('BUILDS')
    extractOptionsAndArguments(
        argInfoGame,
        'npm run builds',
        'Builds all targets given in builds.cjs to subfolders in the dists folder'
    )
    try {
        execSync("webpack --config webpack.build-dists.cjs && node bin/post-build.cjs", {
            stdio: 'inherit',
            cwd: absPath.engine()
        })
    } catch (e) {
        if (e.status !== ERROR_STATUS_HANDLED) throw e
    }
} catch (e) {
    errorSection(e)
}