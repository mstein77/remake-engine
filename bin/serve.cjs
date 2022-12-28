const { absDir, syncFs, cleanTmpDir } = require('../src/build/classes.cjs')
const { spawn, spawnSync } = require('child_process')

if (syncFs.isEmptyDir(absDir.dist())) {
    const build = spawnSync('npm', ['run', 'build'], {
        stdio: 'inherit',
        cwd: absDir.game()
    })
    console.log(build.output.toString('utf8'));
    if (build.status !== 0) {
        process.exit(build.status)
    }
}

if (syncFs.fileExists(absDir.dist('package.json')) && syncFs.isEmptyDir(absDir.dist('node_modules'))) {
    const install = spawnSync('npm', ['install'], {
        stdio: 'inherit',
        cwd: absDir.dist()
    })
    console.log(install.output.toString('utf8'));
    if (install.status !== 0) {
        process.exit(install.status)
    }
}

const args = ['run']
args.push(
    syncFs.fileExists(absDir.dist('server.cjs')) ? 'start-server' : 'start-static'
)
spawn('npm', args, {
    stdio: 'inherit',
    cwd: absDir.engine()
});