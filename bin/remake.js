#! /usr/bin/env node
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const { colorLog, FG } = require('../src/shared/classes/color.cjs')
const { syncFs } = require('../src/shared/classes/syncFs.cjs')
const { d, toPairs } = require('../src/shared/classes/helper.cjs')

const __dirname = syncFs.realpath(dirname(fileURLToPath(import.meta.url)) + '/../')
const dotenvPath = __dirname + '/.env'
colorLog(dotenvPath)
dotenv.config({path: dotenvPath})

const enginePackage = '2dfireengine'
const packageJsonPath = './package.json'
const engineBasePath = './node_modules/' + enginePackage

function exec(cmd, expectedStatus = 0) {
    colorLog()
    colorLog(FG.YELLOW + `Executing: ${FG.WHITE + cmd}`)
    colorLog()
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
        const setGameDir = 'RMK_GAME_DIR=$(pwd) '
        packageJson.scripts.start = setGameDir + 'npm run start --prefix ' + engineBasePath
        packageJson.scripts.game = setGameDir + 'npm run build-game-dev --prefix ' + engineBasePath
        if (packageJson.type === undefined) {
            packageJson.type = 'module'
        }
        packageJson.scripts.build = setGameDir + 'npm run build-game-prod --prefix ' + engineBasePath

        syncFs.writeJson(packageJsonPath, packageJson)
        packageJson = syncFs.readJson(packageJsonPath)
    }

    let baseConfig = {
        title: 'Remake Engine Game V0.1',
        browsers: '>2.25%, not ie 11, not op_mini all',
        editor: true,
        editorKey: 'Dead',
        resourceLoading: 'api',
        apiMaxJsonSize: '10mb',
        staticTypes: 'audio,video',
        deployMethod: 'checkout',
        hosting: 'server-with-nodejs',
        server: true,
        compress: true,
        minimize: false,
        baseUrl: 'http://localhost:8080',
        sourceMaps: true,
        sourceMapType: 'eval-cheap-source-map',
        eslint: false,
        envPrefix: 'RMK_',
        openBrowser: 'default',
        clientLogging: 'info',
        serverLogging: 'info',
        serverLoggingFormat: 'dev',
        stats: 'normal',
        analyseBundles: false,
        debugPlugins: false,
        port: 8080,
        dist: {
            editor: false,
            minimize: true,
            sourceMaps: false,
            eslint: false
        }
    };
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
        '.gitignore': ["dist/", "node_modules/", ".env"].join("\n"),
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