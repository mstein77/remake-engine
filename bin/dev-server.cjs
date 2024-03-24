const absPath = require('../src/shared/absPath.cjs')
const { quoteArg } = require('../src/shared/console.cjs')
const { d } = require('../src/shared/helper.cjs')
const { execSync } = require('child_process')

execSync("nodemon -q " + "-w '" + absPath.game("*.cjs") + "' -e cjs --exec " + quoteArg("webpack-dev-server") + " -- --config webpack.build-dev.cjs", {
    stdio: 'inherit',
    cwd: absPath.engine()
})