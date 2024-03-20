const { spawn} = require("child_process")
const absPath = require("../src/shared/absPath.cjs")
const syncFs = require("../src/shared/syncFs.cjs")
const { NoStackError, errorSection } = require("../src/shared/console.cjs")
const { getPreviewConfigs, DEPLOYMENT_METHOD } = require("../src/build/config.cjs")
const { d } = require("../src/shared/helper.cjs")
const { getDefaultFromModule } = require("../src/build/helper.cjs")

try {
    if (!process.env.RMK_GAME_DIR)
        throw NoStackError(`Command "npm run preview" must be called from the game directory`)

    const args = []
    let overwrites = {}
    let cwd = absPath.dist()
    if (process.argv.length > 2) {
        const target = process.argv[2]
        const targetPath = absPath.dists(target)
        if (!syncFs.dirExists(targetPath))
            throw NoStackError(`The target build "${target}" does not exists in ${absPath.dists()}`)

        const buildsJson = getDefaultFromModule(absPath.game('builds.cjs'))
        overwrites = buildsJson[target]

        cwd = targetPath
        args.push(target)
    }

    const { distConfig } = getPreviewConfigs(overwrites)

    if (distConfig.server && distConfig.deploymentMethod !== DEPLOYMENT_METHOD.UPLOAD_PUBLIC) {
        args.unshift(
            'run',
            'preview'
        )
        spawn('npm', args, {
            stdio: 'inherit',
            cwd
        })
    } else {
        args.unshift(
        'run',
            'start-static-preview'
        )
        spawn('npm', args, {
            stdio: 'inherit',
            cwd: absPath.engine()
        })
    }
} catch (e) {
    errorSection(e, 'PREVIEW')
}