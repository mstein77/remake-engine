const Deliverable = require("../deliverable.cjs")
const { RESOURCE_LOADING, PLATFORMS, ASSET_TYPE} = require("../config.cjs")
const { getReplaceMetaVars } = require("../helper.cjs")
const { d, csv2values, toValues } = require('../../shared/helper.cjs')
const { exec } = require("../../shared/console.cjs")
const pngToIco = require('png-to-ico')

const MAKERS = {
    DMG: 'dmg',
    ZIP: 'zip',
    DEB: 'deb',
    WIX: 'wix'
}

/**
 * A class for building the game as an electron app file which includes all resources, style and scripts
 */
class ElectronApp extends Deliverable {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.hasMakeStep = true
        this.isAllInOne = true
        this.hasAppIcon = true
        this.hasFavIcon = true
    }

    getConfigKeys() {
        return {
            name: {type: 'string', default: '{config.shortName}'},
            description: {type: 'string', default: '{config.description}'},
            makers: {type: 'csv', values: toValues(MAKERS), default: [MAKERS.ZIP].join(',')},
            windowConfig: {type: 'json', default: {}}
        }
    }

    /**
     * @inheritDoc
     */
    supportsResourceLoading(value) {
        if (value === RESOURCE_LOADING.LOCAL_ALL) return true

        return RESOURCE_LOADING.LOCAL_ALL
    }

    getAssetTypePlatforms(assetType, platforms) {
        if (assetType !== 'appIcon') return platforms

        switch (process.platform) {
            case 'darwin':
                return [PLATFORMS.MACOS]

            case 'win32':
                return [PLATFORMS.WINDOWS]

            default:
                return [PLATFORMS.LINUX]
        }
    }

    getAssetTypeSubTypes(type, subTypes) {
        return (type !== 'appIcon') ? subTypes : [ASSET_TYPE.ICNS]
    }

    /**
     * @inheritDoc
     */
    getRequiredPrograms() {
        return {
            'electron': '*'
        }
    }

    /**
     * @inheritDoc
     */
    getProgramsInstaller() {
        return {
            'electron': 'npm install electron --prefix [[path]] --save-dev'
        }
    }

    async buildIconSetFromPath(path) {
        const { syncFs, absPath, queue } = this.fileDeps
        let icon
        const assetsPath = absPath.artifactsIn('assets')
        queue.addClear(assetsPath, true)
        await queue.processAsync()

        switch (process.platform) {

            case 'win32': {
                // generate ico file
                const iconRegexp = /^icon\-[0-9]+\.png$/
                const files = syncFs.readFiles(path)
                    .filter(item => iconRegexp.test(item))
                    .map(name => absPath.make(path, name))
                if (!files.length) return

                const buffer = await pngToIco(files)
                const icoFile = absPath.make(assetsPath, 'icon.ico')
                syncFs.writeContent(icoFile, buffer)
                icon = icoFile
                break
            }
            case 'darwin': {
                // generate icns file
                const iconRegexp = /^icon\-[0-9]+x[0-9]+(@[0-9]+x)?\.png$/
                const files = syncFs.readFiles(path)
                    .filter(item => iconRegexp.test(item))
                if (!files.length) return

                const iconsetPath = absPath.make(assetsPath, 'icon.iconset')
                queue.addClear(iconsetPath, true)
                for (const file of files) {
                    queue.addMove(absPath.make(path, file), absPath.make(iconsetPath, file))
                }
                const icnsFile = absPath.make(assetsPath, 'icon.icns')
                queue.addExec(`iconutil -c icns ${iconsetPath}`)
                queue.addDelete(iconsetPath)
                icon = icnsFile
                break
            }
            default:
                // use png file
                const iconRegexp = /^icon\-[0-9]+\.png$/
                const files = syncFs.readFiles(path)
                    .filter(item => iconRegexp.test(item))
                if (!files.length) return

                const file = files[0]
                icon = absPath.make(assetsPath, file)
                queue.addMove(absPath.make(path, file), icon)

                return icon
        }
        return syncFs.withoutExt(icon)
    }

    /**
     * @inheritDoc
     */
    async prepareMake() {
        const { metaVars } = this.contents
        const { queue, absPath } = this.fileDeps
        const { publicDir, config, assets } = this.distTarget

        let add2packagerConfig = false
        let add2makerDeb = false
        let add2makerWix = false
        for (const { scope, links } of assets) {
            if (scope !== 'appIcon') continue

            if (links.includes('packagerConfig.icon')) {
                add2packagerConfig = true
            }
            if (links.includes('maker-deb')) {
                add2makerDeb = true
            }
            if (links.includes('maker-wix')) {
                add2makerWix = true
            }
        }
        const icon = await this.buildIconSetFromPath(absPath.dist(publicDir, 'assets'))
        const packagerConfig = {}
        if (add2packagerConfig) packagerConfig.icon = icon

        queue.addCopy(absPath.dist(publicDir, 'index.html'), absPath.artifactsIn('index.html'))
        const defaultWinConfig = {
            width: 800,
            height: 600,
            autoHideMenuBar: true,
            webPreferences: {}
        }
        const windowConfig = {
            ...defaultWinConfig,
            ...this.config.windowConfig
        }
        windowConfig.webPreferences = {
            ...{
                nodeIntegration: true,
                devTools: false
            },
            ...windowConfig.webPreferences
        }
        if (!windowConfig.width) windowConfig.width = 800
        if (!windowConfig.height) windowConfig.height = 600
        if (icon && icon.endsWith('.png')) {
            windowConfig.icon = icon
        }
        queue.addCopy(absPath.src('build/assets/electron-app/main.cjs'), absPath.artifactsIn('main.cjs'), {
            '[[WINDOW_CONFIG]]': JSON.stringify(windowConfig)
        })

        const { name, description, shortName } = config
        const replaceMetaVars = getReplaceMetaVars(metaVars, { name, description, shortName })

        const reqMakers = csv2values(this.config.makers)
        const makers = []
        const devDependencies = {
            "@electron-forge/cli": "^7.3.0"
        }
        for (const reqMaker of reqMakers) {
            let maker = null
            switch (reqMaker) {
                case MAKERS.WIX:
                case MAKERS.DEB:
                case MAKERS.DMG:
                case MAKERS.ZIP:
                    const name = `@electron-forge/maker-${reqMaker}`
                    maker = { name }
                    devDependencies[name] = '*'
                    break
            }
            if (!maker) continue

            const config = {}
            switch (reqMaker) {
                case MAKERS.DEB:
                    if (add2makerDeb) config.options = { icon }
                    break

                case MAKERS.WIX:
                    if (add2makerWix) config.icon = icon
                    break
            }
            maker.config = config
            makers.push(maker)
        }
        queue.addWriteJson(
            absPath.artifactsIn('package.json'),
            {
                name: replaceMetaVars(this.config.name),
                version: metaVars['game.version'],
                description: replaceMetaVars(this.config.description),
                main: 'main.cjs',
                scripts: {
                    "start": "electron-forge start",
                    "package": "electron-forge package",
                    "make": "electron-forge make"
                },
                keywords: metaVars['game.keywords'],
                author: metaVars['game.author'],
                license: 'ISC',
                "config": {
                    "forge": {
                        packagerConfig,
                        "outDir": absPath.artifactsOut(),
                        "makers": makers
                    }
                },
                dependencies: {
                    "electron": "^29.1.1"
                },
                devDependencies
            }
        )
        const cwd = absPath.artifactsIn()
        queue
            .addExec(`npm install`, { cwd })
            .addExec(`npm install --save-dev @electron-forge/plugin-fuses`, { cwd })
            .addExec(`npm exec --package=@electron-forge/cli -c "electron-forge import"`, { cwd })
        await queue.processAsync()
    }

    async make() {
        const { queue, absPath } = this.fileDeps
        queue
            .addExec(`npm run make`, { cwd: absPath.artifactsIn() })

        await queue.processAsync()
    }

    async finishMake() {
        const { queue, absPath } = this.fileDeps

        const { publicDir } = this.distTarget
        const targetPath = absPath.dist(publicDir)
        const makers = csv2values(this.config.makers)
        queue
            .addClear(targetPath, false)
            .addReduce(absPath.artifactsOut(), makers, targetPath)

        await queue.processAsync()
    }

    async open() {
        const { absPath } = this.fileDeps

        const result = await exec('npm run start', { cwd: absPath.artifactsIn() })
        if (result.failed)
            throw Error(`Could not open electron app: ` + result.output)
    }
}

module.exports = ElectronApp