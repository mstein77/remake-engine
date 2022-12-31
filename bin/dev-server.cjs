const { absDir } = require('../src/build/classes.cjs')
const { execSync } = require('child_process')

execSync("nodemon " + "-w '" + absDir.game("*.cjs") + "' -e cjs --exec 'webpack-dev-server' -- --config webpack.build-dev.cjs", {
    stdio: 'inherit',
    cwd: absDir.engine()
})