const { absDir, syncFs, cleanTmpDir } = require('../src/build/classes.cjs')
const { execSync, spawn, spawnSync } = require('child_process')

execSync("nodemon " + "-w '" + absDir.game("*.cjs") + "' -e cjs --exec 'webpack-dev-server' -- --config webpack.build-dev.cjs", {
    stdio: 'inherit',
    cwd: absDir.engine()
})
/*
const args =  []
spawn('nodemon', args, {
    stdio: 'inherit',
    cwd: absDir.engine()
})

 */