const Deliverable = require("../deliverable.cjs")
const { RESOURCE_LOADING, PLATFORMS} = require("../config.cjs")
const { getReplaceMetaVars } = require("../helper.cjs")
const { d, csv2values, toValues } = require('../../shared/helper.cjs')
const { exec } = require("../../shared/console.cjs")
const pngToIco = require('png-to-ico')

const MAKERS = {
    DMG: 'dmg',
    ZIP: 'zip'
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
            background_color: {type: 'string', default: ''},
            makers: {type: 'csv', values: toValues(MAKERS), default: [MAKERS.ZIP].join(',')}
        }
    }

    /**
     * @inheritDoc
     */
    supportsResourceLoading(value) {
        if (value === RESOURCE_LOADING.LOCAL_ALL) return true

        return RESOURCE_LOADING.LOCAL_ALL
    }

    getAllowedPlatforms(platforms) {
        switch (process.platform) {
            case 'darwin':
                return [PLATFORMS.MACOS]

            case 'win32':
                return [PLATFORMS.WINDOWS]

            default:
                return [PLATFORMS.LINUX]
        }
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

    async buildIconSetFromPath(path, fileDeps) {
        const { syncFs, absPath, queue } = fileDeps
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
                const buffer = await pngToIco(files)
                const icoFile = absPath.make(assetsPath, 'icon.ico')
                syncFs.writeContent(icoFile, buffer)
                icon = icoFile
                break
            }
            case 'darwin': {
                // generate icns file
                const iconRegexp = /^icon\-[0-9]+x[0-9]+\.png$/
                const files = syncFs.readFiles(path)
                    .filter(item => iconRegexp.test(item))
                const iconsetPath = absPath.make(assetsPath, 'icon.iconset')
                queue.addClear(iconsetPath, true)
                for (const file of files) {
                    queue.addMove(absPath.make(path, file), absPath.make(iconsetPath, file))
                }
                const icnsFile = absPath.make(assetsPath, 'icon.icns')
                queue.addExec(`iconutil -c icns ${iconsetPath}`)
                icon = icnsFile
                break
            }
            default:
                // TODO use png file
                return
        }
        return syncFs.withoutExt(icon)
    }

    /**
     * @inheritDoc
     */
    async prepareMake(distTarget, configs, fileDeps) {
        const { metaVars } = configs
        const { queue, absPath } = fileDeps
        const { publicDir, config } = distTarget

        const icon = await this.buildIconSetFromPath(absPath.dist(publicDir, 'assets'), fileDeps)
        queue.addCopy(absPath.dist(publicDir, 'index.html'), absPath.artifactsIn('index.html'))
        queue.addCopy(absPath.src('build/assets/electron-app/main.cjs'), absPath.artifactsIn('main.cjs'))

        const { name, description, shortName } = config
        const replaceMetaVars = getReplaceMetaVars(metaVars, { name, description, shortName })

        const reqMakers = csv2values(this.config.makers)
        const makers = []
        const devDependencies = {
            "@electron-forge/cli": "^7.3.0"
        }
        for (const maker of reqMakers) {
            switch (maker) {
                case MAKERS.DMG:
                case MAKERS.ZIP:
                    const name = `@electron-forge/maker-${maker}`
                    makers.push({
                        name
                    })
                    devDependencies[name] = '*'
                    break;
            }
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
                        packagerConfig: {
                            icon
                        },
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

    async make(distTarget, configs, fileDeps) {
        const { queue, absPath } = fileDeps
        queue
            .addExec(`npm run make`, { cwd: absPath.artifactsIn() })

        await queue.processAsync()
    }

    async finishMake(distTarget, configs, fileDeps) {
        const { queue, absPath } = fileDeps

        const { publicDir } = distTarget
        const targetPath = absPath.dist(publicDir)
        const makers = csv2values(this.config.makers)
        queue
            .addClear(targetPath, false)
            .addReduce(absPath.artifactsOut(), makers, targetPath)

        await queue.processAsync()
    }

    async open(distTarget, configs, fileDeps) {
        const { absPath } = fileDeps

        const result = await exec('npm run start', { cwd: absPath.artifactsIn() })
        if (result.failed)
            throw Error(`Could not open electron app: ` + result.output)
    }
}

module.exports = ElectronApp