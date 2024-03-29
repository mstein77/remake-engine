const { execSync} = require("child_process")
const absPath = require("../src/shared/absPath.cjs")
const { extractOptionsAndArguments, log, bold, errorSection} = require("../src/shared/console.cjs");
const { argInfoGame} = require("../src/build/helper.cjs");

try {
    extractOptionsAndArguments(
        { ...argInfoGame, matches: [/^[a-z0-9_]+$/] },
        'npm run build [target]',
        'Builds the game in dist folder if no target is given, or the target in the dists folder',
    )
    execSync("webpack --config webpack.build-dist.cjs && node bin/post-build.cjs", {
        stdio: 'inherit',
        cwd: absPath.engine()
    })
} catch (e) {
    errorSection(e, 'BUILD')
}
