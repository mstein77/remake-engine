const absPath = require("../src/shared/absPath.cjs")
const syncFs = require("../src/shared/syncFs.cjs")
const { spawnSync, NoStackError, errorSection, getParsedArguments, extractOptionsAndArguments} = require("../src/shared/console.cjs")
const { getPreviewConfigs, DEPLOYMENT_METHOD } = require("../src/build/config.cjs")
const { d } = require("../src/shared/helper.cjs")
const { getDefaultFromModule } = require("../src/build/helper.cjs")

try {
    const { arguments } = extractOptionsAndArguments(
        {
            flags: {h: 'help'},
            options: {
                help: {desc: 'Show help'},
                preview: {hidden: true}
            }
        },
        'npm run preview [target]',
        [
            'Tries to run the dist build (or the given target in the dists folder) locally.',
            'Depending on the deliverable either in the browser or directly'
        ]
    )
    const args = []
    let overwrites = {}
    let cwd = absPath.dist()
    if (arguments.length) {
        const target = arguments[0]
        const targetPath = absPath.dists(target)
        if (!syncFs.dirExists(targetPath))
            throw NoStackError(`The target build "${target}" does not exists in ${absPath.dists()}`)

        const buildsJson = getDefaultFromModule(absPath.game('builds.cjs'))
        overwrites = buildsJson[target]

        cwd = targetPath
        args.push(target)
    }

    const { distConfig } = getPreviewConfigs({ absPath, syncFs }, overwrites)

    process.env.RMK_SCRIPT_ARGS += '\t--preview'
    if (distConfig.server && distConfig.deploymentMethod !== DEPLOYMENT_METHOD.UPLOAD_PUBLIC) {
        args.unshift(
            'run',
            'preview'
        )
        spawnSync('npm', args, {
            stdio: 'inherit',
            cwd
        })
    } else {
        args.unshift(
        'run',
            'start-static-preview'
        )
        spawnSync('npm', args, {
            stdio: 'inherit',
            cwd: absPath.engine()
        })
    }
} catch (e) {
    errorSection(e, 'PREVIEW')
}