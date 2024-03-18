const Deliverable = require("../deliverable.cjs")
const { RESOURCE_LOADING} = require("../config.cjs")
const { getReplaceMetaVars } = require("../helper.cjs")
const { d, csv2values, toValues } = require('../../shared/helper.cjs')

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
            hasCompiler: true
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
    prepareCompile(distTarget, configs, fileDeps) {
        const { metaVars, config } = configs
        const { queue, absPath } = fileDeps
        const { publicDir } = distTarget

        const { name, description, shortName } = config
        const replaceMetaVars = getReplaceMetaVars(metaVars, { name, description, shortName })

        const distSourcePath = absPath.dist(publicDir, 'main.cjs')
        queue.addCopy(absPath.src('build/assets/electron-app/main.cjs'), distSourcePath)

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
            absPath.dist(publicDir, 'package.json'),
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
        queue.process()
    }

    compile(distTarget, configs, fileDeps) {
        const { queue, absPath, syncFs } = fileDeps
        const { publicDir, assets } = distTarget

        const targetPath = absPath.dist(publicDir)
        const makers = csv2values(this.config.makers)


        // pre-compile
        queue
            .addExec(`npm install`, {cwd: targetPath})
            .addExec(`npm install --save-dev @electron-forge/plugin-fuses`, {cwd: targetPath})
            .addExec(`npm exec --package=@electron-forge/cli -c "electron-forge import"`, {cwd: targetPath})

        // prepare assets


        queue
            .addExec(`npm run make`, {cwd: targetPath})
            .addClear(targetPath, false, ['out'])
            .addReduce(syncFs.absPath(targetPath, 'out'), makers, targetPath)
            .process()
    }
}

module.exports = ElectronApp