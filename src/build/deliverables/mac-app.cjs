const Deliverable = require("../deliverable.cjs")
const { d } = require("../../shared/helper.cjs")
const { exec } = require("../../shared/console.cjs")
const { RESOURCE_LOADING} = require("../config.cjs")

/**
 * A class for building the game as an executable on MacOS using swift. Requires the swiftc compiler and the MacOS
 * platform
 */
class MacApp extends Deliverable {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.hasMakeStep = true
        this.isAllInOne = true
        this.hasAppIcon = false
        this.hasFavIcon = true
    }

    /**
     * @inheritDoc
     */
    getRequiredPlatforms() {
        return ['darwin']
    }

    /**
     * @inheritDoc
     */
    getRequiredPrograms() {
        return {
            swiftc: '*'
        }
    }

    /**
     * @inheritDoc
     */
    supportsResourceLoading(value) {
        if (value === RESOURCE_LOADING.LOCAL_ALL) return true

        return RESOURCE_LOADING.LOCAL_ALL
    }

    /**
     * @inheritDoc
     */
    async prepareMake(distTarget, configs, fileDeps) {
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

        queue.addClear(absPath.artifactsIn('assets'), true)
        queue.addCopy(absPath.dist(publicDir, 'index.html'), absPath.artifactsIn('assets', 'index.html'))
        queue.addCopy(absPath.src('build/assets/mac-app/main.swift'), absPath.artifactsIn('main.swift'))
        await queue.processAsync()
    }

    /**
     * @inheritDoc
     */
    async make(distTarget, configs, fileDeps) {
        const { gamePackageJson } = configs
        const { queue, absPath } = fileDeps

        const outFile = absPath.artifactsOut(gamePackageJson.name)
        const sourcePath = absPath.artifactsIn('main.swift')

        queue.addExec(
            `swiftc -import-objc-header /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks/WebKit.framework/Headers/WebKit.h -o ${outFile} ${sourcePath}`)

        await queue.processAsync()
    }

    async finishMake(distTarget, configs, fileDeps) {
        const { gamePackageJson } = configs
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

        const outFile = absPath.artifactsOut(gamePackageJson.name)
        queue.addCopy(outFile, absPath.dist(publicDir, gamePackageJson.name))
        queue.addCopy(absPath.artifactsIn('assets', 'index.html'), absPath.dist(publicDir, 'assets', 'index.html'))
        queue.addClear(absPath.dist(publicDir), false, [gamePackageJson.name, 'assets'])
        await queue.processAsync()
    }

    async open(distTarget, configs, fileDeps) {

        const { config, target } = distTarget
        const { gamePackageJson } = configs
        const { absPath } = fileDeps

        const publicDir = config.server ? 'public' : ''
        const publicPath = target ? absPath.dists(target, publicDir) : absPath.dist(publicDir)

        const appPath = absPath.make(publicPath)
        const result = await exec('open --wait-apps -n -a ' + appPath + '/' + gamePackageJson.name, { cwd: publicPath })
        if (result.failed)
            throw Error(`Could not open deliverable: ` + result.output)
    }
}

module.exports = MacApp