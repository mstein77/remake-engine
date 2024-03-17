const { spawn} = require("child_process")
const absPath = require("../src/shared/absPath.cjs")
const { NoStackError, errorSection } = require("../src/shared/console.cjs")
const { getPreviewConfigs, DEPLOYMENT_METHOD } = require("../src/build/config.cjs")
const { d } = require("../src/shared/helper.cjs")

try {
    if (!process.env.RMK_GAME_DIR)
        throw NoStackError(`Command "npm run preview" must be called from the game directory`)

    const { distConfig } = getPreviewConfigs()

    if (distConfig.server && distConfig.deploymentMethod !== DEPLOYMENT_METHOD.UPLOAD_PUBLIC) {
        const args = ['run']
        args.push(
            'preview'
        )
        spawn('npm', args, {
            stdio: 'inherit',
            cwd: absPath.dist()
        })
    } else {
        const args = ['run']
        args.push(
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