const absPath = require("../src/shared/absPath.cjs")
const syncFs = require("../src/shared/syncFs.cjs")
const { spawnSync, NoStackError, errorSection, extractOptionsAndArguments } = require("../src/shared/console.cjs")

try {
    const { arguments } = extractOptionsAndArguments(
        {
            flags: {h: 'help'},
            options: {
                help: {desc: 'Show help'}
            }
        },
        'npm run start [target]',
        [
            'Tries to start the server of the dist build (or the given target in the dists folder)'
        ]
    )
    let cwd = absPath.dist()
    let target = null
    if (arguments.length) {
        target = arguments[0]
        const targetPath = absPath.dists(target)
        if (!syncFs.dirExists(targetPath))
            throw NoStackError(`The target build "${target}" does not exists in ${absPath.dists()}`)

        cwd = targetPath
    }
    if (!target) {
        if (syncFs.isEmptyDir(absPath.dist())) {
            console.log(`Executing "npm install" in dist folder...`)
            const build = spawnSync('npm', ['run', 'build'], {
                stdio: 'inherit',
                cwd: absPath.game()
            })
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
            if (install.status !== 0) {
                process.exit(install.status)
            }
        }
    }

    const serverPath = absPath.make(cwd, 'server.cjs')
    if (syncFs.fileExists(serverPath)) {
        console.log(`Starting server in dist folder...`)
        const args = ['run']
        args.push(
            'start'
        )
        spawnSync('npm', args, {
            stdio: 'inherit',
            cwd
        })
    } else {
        console.log(`Build in ${cwd} was build without server...aborting`)
    }
} catch (e) {
    errorSection(e, 'SERVER')
}
