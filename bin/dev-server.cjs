const absPath = require('../src/shared/absPath.cjs')
const { quoteArg, extractOptionsAndArguments, errorSection} = require('../src/shared/console.cjs')
const { argInfoGame } = require('../src/build/helper.cjs')
const { d } = require('../src/shared/helper.cjs')
const { execSync } = require('child_process')

try {
    extractOptionsAndArguments(
        argInfoGame,
        'npm run dev|game',
        'Builds the current version of the game and opens it in the browser if the build was successful'
    )
    execSync("nodemon -q " + "-w '" + absPath.game("*.cjs") + "' -e cjs --exec " + quoteArg("webpack-dev-server") + " -- --config webpack.build-dev.cjs", {
        stdio: 'inherit',
        cwd: absPath.engine()
    })
} catch (e) {
    errorSection(e, 'GAME')
}
