const Deliverable = require("../deliverable.cjs")
const { RESOURCE_LOADING} = require("../config.cjs")
const { getReplaceMetaVars } = require("../helper.cjs")
const { d, csv2values, toValues } = require('../../shared/helper.cjs')
const { exec } = require("../../shared/console.cjs");

const MAKERS = {
    DMG: 'dmg',
    ZIP: 'zip'
}

/**
 * A class for building the game as an electron app file which includes all resources, style and scripts
 */
class ElectronApp extends Deliverable {

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
    getSupport() {
        return {
            ...super.getSupport(),
            hasMakeStep: true
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

    /**
     * @inheritDoc
     */
    async prepareMake(distTarget, configs, fileDeps) {
        const { metaVars, config } = configs
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

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
                        "outDir": absPath.artifactsOut(),
                        "packagerConfig": {},
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