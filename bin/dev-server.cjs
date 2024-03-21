const absPath = require('../src/shared/absPath.cjs')
const { execSync } = require('child_process')

const quoteArg = arg => process.platform !== 'win32' ? `'${arg}'` : `"${arg}"`

execSync("nodemon -q " + "-w '" + absPath.game("*.cjs") + "' -e cjs --exec " + quoteArg("webpack-dev-server") + " -- --config webpack.build-dev.cjs", {
    stdio: 'inherit',
    cwd: absPath.engine()
})