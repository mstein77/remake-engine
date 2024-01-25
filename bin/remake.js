#! /usr/bin/env node
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const { log, FG } = require('../src/shared/console.cjs')
const { syncFs } = require('../src/shared/syncFs.cjs')
const { d, toPairs } = require('../src/shared/helper.cjs')
const { getDefaultConfig } = require('../src/build/const.cjs')

const __dirname = syncFs.realpath(dirname(fileURLToPath(import.meta.url)) + '/../')
const dotenvPath = __dirname + '/.env'
log(dotenvPath)
dotenv.config({path: dotenvPath})

const enginePackage = '2dfireengine'
const packageJsonPath = './package.json'
const engineBasePath = './node_modules/' + enginePackage

function exec(cmd, expectedStatus = 0) {
    log()
    log(FG.YELLOW + `Executing: ${FG.WHITE + cmd}`)
    log()
    try {
        const stdout = execSync(cmd, {encoding: 'utf8', stdio: 'inherit'})
        return stdout !== null ? stdout.toString() : null
    } catch (err) {
        if (err.status === expectedStatus) {
            return err.stdout
        }
        console.error(err)
        throw err
    }
}

function addMissingDirsAndFiles(missing, path = './') {
    for (const [ name, content ] of toPairs(missing)) {
        const itemPath = path + name
        switch (typeof content) {

            case 'string':
                if (!syncFs.fileExists(itemPath)) {
                    syncFs.writeFile(itemPath, content)
                }
                break

            case 'object':
                if (!syncFs.dirExists(itemPath)) {
                    syncFs.mkdir(itemPath)
                }
                addMissingDirsAndFiles(missing[name], itemPath + '/')
                break
        }
    }
}
try {
    if (!syncFs.dirExists('.git')) {
        exec('git init')
    }
    if (!syncFs.fileExists('./package.json')) {
        exec('npm init -y')
    }
    let packageJson = readJson(packageJsonPath)
    if (!isObject('object'))
        throw Error(`Could not parse package.json!`)

    if (packageJson.name === enginePackage)
        throw Error('Cannot be executed in the engine package!')

    const hasPackage = (packageJson.dependencies !== undefined && packageJson.dependencies[enginePackage] !== undefined)
    if (!hasPackage) {
        // TODO get PAT and link out of here
        exec('npm install git+https://' + process.env.PAT + '@github.com/mstein77/2DFireEngine.git\\#feature/engineBuild')
        packageJson = syncFs.readJson(packageJsonPath)
    }
    const hasScript = (packageJson.scripts !== undefined && packageJson.scripts.game !== undefined)
    if (!hasScript) {
        if (packageJson.scripts === undefined) {
            packageJson.scripts = {}
        }
        const engineRelPath = './node_modules/2dfireengine'
        const setGameDir = 'RMK_GAME_DIR=$(pwd) '
        packageJson.scripts.game = setGameDir + 'npm run build-game-dev --prefix ' + engineRelPath
        packageJson.scripts.build = setGameDir + 'npm run build-game-dist --prefix ' + engineRelPath
        packageJson.scripts.build = setGameDir + 'npm run build-info-dist --prefix ' + engineRelPath
        packageJson.scripts.builds = setGameDir + 'npm run build-game-dists --prefix ' + engineRelPath
        packageJson.scripts.start = setGameDir + 'npm run start --prefix ' + engineRelPath
        if (packageJson.type === undefined) {
            packageJson.type = 'module'
        }

        syncFs.writeJson(packageJsonPath, packageJson)
        packageJson = syncFs.readJson(packageJsonPath)
    }

    const baseConfig = getDefaultConfig()
    addMissingDirsAndFiles({
        resources: {
            json: {},
            image: {},
            audio: {}
        },
        src: {
            'index.js': [
                'import { Game } from "' + enginePackage + '";',
                '// your game starts here...',
                'console.log(\'Let the games begin...\')',
            ].join("\n"),
            screens: {},
            panes: {}
        },
        dist: {},
        '.npmrc': "loglevel=silent%",
        '.gitignore': ["dist/", "dists/", "node_modules/", ".env"].join("\n"),
        'config.cjs': "module.exports = " + JSON.stringify(baseConfig, null, 2)
    });

    // trigger install of engine dependencies
    if (!syncFs.dirExists( + engineBasePath + '/node_modules')) {
        exec('npm install --prefix=' + engineBasePath)
    }
    process.exit(0)
} catch (err) {
    console.error(err)
    process.exit(1)
}