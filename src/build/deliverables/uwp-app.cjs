const Deliverable = require("../deliverable.cjs")
const { d } = require("../../shared/helper.cjs")
const { RESOURCE_LOADING } = require("../config.cjs")

/**
 * A class for building the game as an executable on Windows using C#
 */
class UwpApp extends Deliverable {

    /**
     * @inheritDoc
     */
    getSupport() {
        return {
            ...super.getSupport(),
            hasMakeStep: true,
            appIcon: true
        }
    }

    /**
     * @inheritDoc
     */
    getRequiredPlatforms() {
        return ['win32']
    }

    /**
     * @inheritDoc
     */
    getRequiredPrograms() {
        return {
            msbuild: '*'
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
        const { gamePackageJson } = configs
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

        queue.addCopy(absPath.dist(publicDir, 'index.html'), absPath.artifactsIn('index.html'))
        for (const filename of ['MainPage.xaml', 'MainPage.xaml.cs', 'Package.appxmanifest']) {
            queue.addCopy(absPath.src(`build/assets/uwp-app/${filename}`), absPath.artifactsIn(filename))
        }
        const csprojPath = absPath.artifactsIn(`${gamePackageJson.name}.csproj`)
        queue.addCopy(absPath.src('build/assets/uwp-app/example.csproj'), csprojPath)

        await queue.processAsync()
    }

    /**
     * @inheritDoc
     */
    async make(distTarget, configs, fileDeps) {
        const { gamePackageJson } = configs
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

        const cwd = absPath.dist(absPath.artifactsIn())
        queue.addExec(`dotnet restore`, { cwd })
        queue.addExec(`msbuild ${gamePackageJson.name}.csproj /t:build /p:Configuration=Release /p:OutputPath=${absPath.artifactsOut()}` , { cwd })
        // queue.addClear(cwd, ['index.html', ])

        await queue.processAsync()
    }
}

module.exports = UwpApp