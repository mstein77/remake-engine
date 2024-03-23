const Deliverable = require("../deliverable.cjs")
const { d } = require("../../shared/helper.cjs")
const { RESOURCE_LOADING} = require("../config.cjs");

/**
 * A class for building the game as an executable on MacOS using swift. Requires the swiftc compiler and the MacOS
 * platform
 */
class MacApp extends Deliverable {

    /**
     * @inheritDoc
     */
    getSupport() {
        return {
            ...super.getSupport(),
            hasCompiler: true
        }
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
    async prepareCompile(distTarget, configs, fileDeps) {
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

        const distSourcePath = absPath.dist(publicDir, 'main.swift')
        queue.addCopy(absPath.src('build/assets/mac-app/main.swift'), distSourcePath)
        await queue.processAsync()
    }

    /**
     * @inheritDoc
     */
    async compile(distTarget, configs, fileDeps) {
        const { gamePackageJson } = configs
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

        const gameFileName = gamePackageJson.name
        const distFile = absPath.dist(publicDir, gameFileName)
        const sourcePath = absPath.dist(publicDir, 'main.swift')

        // pre-compile
        queue.addExec(`swiftc -import-objc-header /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/System/Library/Frameworks/WebKit.framework/Headers/WebKit.h -o ${distFile} ${sourcePath}`)

        // post-compile
        queue.addClear(absPath.dist(publicDir), false, [gameFileName, 'index.html'])
        await queue.processAsync()
    }
}

module.exports = MacApp