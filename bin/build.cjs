const { execSync} = require("child_process")
const absPath = require("../src/shared/absPath.cjs")
const { EXIT_CODE_HANDLED, extractOptionsAndArguments, errorSection, setCliScript } = require("../src/shared/console.cjs")
const { argInfoGame} = require("../src/build/helper.cjs")
const { d } = require("../src/shared/helper.cjs")

try {
    setCliScript('BUILD')
    extractOptionsAndArguments(
        { ...argInfoGame, matches: [/^[a-z0-9_]+$/] },
        'npm run build [target]',
        'Builds the game in dist folder if no target is given, or the target in the dists folder',
    )
    try {
        execSync("webpack --config webpack.build-dist.cjs && node bin/post-build.cjs", {
            stdio: 'inherit',
            cwd: absPath.engine()
        })
    } catch (e) {
        if (e.status !== EXIT_CODE_HANDLED) throw e
    }
} catch (e) {
    errorSection(e)
}
