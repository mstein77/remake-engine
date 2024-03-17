const absPath = require("../src/shared/absPath.cjs")
const syncFs = require("../src/shared/syncFs.cjs")
const { spawn, spawnSync } = require('child_process')

if (syncFs.isEmptyDir(absPath.dist())) {
    console.log(`Executing "npm install" in dist folder...`)
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
    console.log(`Executing "npm install" in dist folder...`)
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
    console.log(`Starting server in dist folder...`)
    const args = ['run']
    args.push(
        'start'
    )
    spawn('npm', args, {
        stdio: 'inherit',
        cwd: absPath.dist()
    })
}