const absPath = require("../src/shared/classes/absPath.cjs")
const syncFs = require("../src/shared/classes/syncFs.cjs")
const { spawn, spawnSync } = require('child_process')

if (syncFs.isEmptyDir(absPath.dist())) {
    const build = spawnSync('npm', ['run', 'build'], {
        stdio: 'inherit',
        cwd: absPath.game()
    })
    console.log(build.output.toString('utf8'))
    if (build.status !== 0) {
        process.exit(build.status)
    }
}

if (syncFs.fileExists(absPath.dist('package.json')) && syncFs.isEmptyDir(absPath.dist('node_modules'))) {
    const install = spawnSync('npm', ['install'], {
        stdio: 'inherit',
        cwd: absPath.dist()
    })
    console.log(install.output.toString('utf8'))
    if (install.status !== 0) {
        process.exit(install.status)
    }
}

const serverPath = absPath.dist('server.cjs')
if (syncFs.fileExists(serverPath)) {
    spawn('node', [serverPath], {
        stdio: 'inherit',
        cwd: absPath.dist()
    })
} else {
    const args = ['run']
    args.push(
        'start-static'
    )
    spawn('npm', args, {
        stdio: 'inherit',
        cwd: absPath.engine()
    })
}