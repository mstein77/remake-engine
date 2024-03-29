#! /usr/bin/env node
import * as dotenv from 'dotenv'
import { execSync } from 'child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { extractOptionsAndArguments, errorSection, log, FG } from '../src/shared/console.cjs'
import syncFs from '../src/shared/syncFs.cjs'
import { d, toPairs } from '../src/shared/helper.cjs'
import { getDefaultConfig } from '../src/build/config.cjs'

try {
    extractOptionsAndArguments(
        {flags: {h: 'help'}, options: {'help': {desc: 'Show help'}}},
        'npx remake-start [game-id]',
        'Creates a new remake for the game with the given game-id in the folder with the same name'
    )
    process.exit(0)

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
            const run = 'node run.cjs '
            packageJson.scripts.dev = run + 'build-game-dev'
            packageJson.scripts.game = run + 'build-game-dev'
            packageJson.scripts.build = run + 'build-game-dist'
            packageJson.scripts.pbuild = run + 'build-game-dist'
            packageJson.scripts.builds = run + 'build-game-dists'
            packageJson.scripts.start = run + 'start'
            packageJson.scripts.preview = run + 'preview'

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
            '.gitignore': ["dist/", ".dist/", "dists/", "node_modules/", ".ssh", ".env"].join("\n"),
            'build.cjs': "module.exports = " + JSON.stringify(baseConfig, null, 2),
            'run.cjs': `const enginePackage = '${enginePackage}'
const path = require('node:path')
const { spawnSync } = require(\`./node_modules/\${enginePackage}/src/shared/console.cjs\`)

process.env.RMK_GAME_DIR = __dirname
spawnSync(
    'npm',
    ['run', '--', ...process.argv.splice(2)],
    {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, 'node_modules/' + enginePackage)
    }
)`
        });

        // trigger install of engine dependencies
        if (!syncFs.dirExists( + engineBasePath + '/node_modules')) {
            exec('npm install', { cwd: engineBasePath })
        }
        process.exit(0)
} catch (e) {
    errorSection(e, 'REMAKE-START')
}
