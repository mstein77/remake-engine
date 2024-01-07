const absPath = require('../src/shared/absPath.cjs')
const { execSync } = require('child_process')

execSync("nodemon -q " + "-w '" + absPath.game("*.cjs") + "' -e cjs --exec 'webpack-dev-server' -- --config webpack.build-dev.cjs", {
    stdio: 'inherit',
    cwd: absPath.engine()
})