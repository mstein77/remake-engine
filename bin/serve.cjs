const absPath = require("../src/shared/absPath.cjs")
const syncFs = require("../src/shared/syncFs.cjs")
const { spawnSync, NoStackError, errorSection, extractOptionsAndArguments, EXIT_CODE_HANDLED, setCliScript } = require("../src/shared/console.cjs")
const { d } = require("../src/shared/helper.cjs")

try {
    setCliScript('SERVER')
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
    try {
        let cwd = absPath.dist()
        let targetPath = absPath.dist()
        let target = null
        if (arguments.length) {
            target = arguments[0]
            targetPath = absPath.dists(target)
            cwd = targetPath
        }
        if (!syncFs.dirExists(targetPath) || syncFs.isEmptyDir(targetPath)) {
            const args = ['run', 'build']
            if (target) args.push(target)
            const build = spawnSync('npm', args, {
                stdio: 'inherit',
                cwd: absPath.game()
            })
            if (build.status !== 0) {
                process.exit(build.status)
            }
        }
        const serverPath = absPath.make(cwd, 'server.cjs')
        if (syncFs.fileExists(serverPath)) {
            const args = ['run']
            args.push(
                'start'
            )
            spawnSync('npm', args, {
                stdio: 'inherit',
                cwd
            })
        } else {
            throw NoStackError(`Build in ${cwd} was build without server...aborting`)
        }
    } catch (e) {
        if (e.status !== EXIT_CODE_HANDLED) throw e
    }
} catch (e) {
    errorSection(e)
}