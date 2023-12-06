const absPath = require('../src/shared/classes/absPath.cjs')
const { execSync } = require('child_process')

execSync("nodemon " + "-w '" + absPath.game("*.cjs") + "' -e cjs --exec 'webpack-dev-server' -- --config webpack.build-dev.cjs", {
    stdio: 'inherit',
    cwd: absPath.engine()
})