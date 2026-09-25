const absPath = require("../src/shared/absPath.cjs")
const syncFs = require("../src/shared/syncFs.cjs")
const { spawnSync, NoStackError, errorSection, extractOptionsAndArguments, EXIT_CODE_HANDLED, setCliScript, mainSection } = require("../src/shared/console.cjs")
const { getPreviewConfigs, DEPLOYMENT_METHOD } = require("../src/build/config.cjs")
const { d } = require("../src/shared/helper.cjs")
const { getDefaultFromModule } = require("../src/build/helper.cjs")
const { DistTarget } = require("../src/build/target.cjs")

try {
    setCliScript('PREVIEW', true)
    const { args } = extractOptionsAndArguments(
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
    try {
        const rawArgs = []
        let overwrites = {}
        let cwd = absPath.dist()
        const target = args[0]

        if (args.length) {
            const targetPath = absPath.dists(target)
            if (!syncFs.dirExists(targetPath))
                throw NoStackError(`The target build "${target}" does not exists in ${absPath.dists()}`)

            const buildsJson = getDefaultFromModule(absPath.game('builds.cjs'))
            overwrites = buildsJson[target]

            cwd = targetPath
            rawArgs.push(target)
        }

        const fileDeps = { absPath, syncFs }
        const { distConfig, deliverable } = getPreviewConfigs(fileDeps, overwrites)
        if (deliverable.hasMakeStep && distConfig.keepArtifacts) {
            absPath.setCurrArtifact(absPath.artifacts(target ? 'dists/' + target : 'dist'))
            const configs = {
                gamePackageJson: syncFs.readJson(absPath.game('package.json'))
            }
            const distTarget = new DistTarget({
                target,
                config: distConfig
            })
            const openApp = async () => await deliverable.open(distTarget, configs, fileDeps)
            mainSection(`Opening deliverable...`)
            openApp()
        } else {
            process.env.RMK_SCRIPT_ARGS += '\t--preview'
            let result
            if (distConfig.server && distConfig.deploymentMethod !== DEPLOYMENT_METHOD.UPLOAD_PUBLIC) {
                rawArgs.unshift(
                    'run',
                    'preview'
                )
                result = spawnSync('npm', rawArgs, {
                    stdio: 'inherit',
                    cwd
                })
            } else {
                rawArgs.unshift(
                    'run',
                    'start-static-preview'
                )
                result = spawnSync('npm', rawArgs, {
                    stdio: 'inherit',
                    cwd: absPath.engine()
                })
            }
            if (result.status) {
                process.exit(result.status)
            }
        }
    } catch (e) {
        if (e.status !== EXIT_CODE_HANDLED) throw e
    }
} catch (e) {
    errorSection(e)
}