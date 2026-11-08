#! /usr/bin/env node
import { execSync } from 'child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import {
    extractOptionsAndArguments, errorSection, log, bold, setCliScript, FG,
    mainSection, subSectionOk, subSectionError, subSection, newLine, subSectionWarning
} from '../src/shared/console.cjs'
import syncFs from '../src/shared/syncFs.cjs'
import { d, toPairs, isObject } from '../src/shared/helper.cjs'

function exec(cmd, expectedStatus = 0, options = {}) {
    log()
    log(FG.YELLOW + `Executing: ${FG.WHITE + cmd}`)
    log()
    try {
        const stdout = execSync(cmd, {encoding: 'utf8', stdio: 'inherit', ...options })
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
                    syncFs.writeContent(itemPath, content)
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

function syncDirectories(srcPath, destPath) {
    if (!syncFs.dirExists(destPath)) return

    const items = syncFs.readdir(srcPath)

    for (const item of items) {
        const srcItemPath = syncFs.join(srcPath, item)
        const destItemPath = syncFs.join(destPath, item)

        const stats = syncFs.stat(srcItemPath)
        if (stats.isDirectory()) {
            syncDirectories(srcItemPath, destItemPath)
        } else if (stats.isFile() && !syncFs.fileExists(destPath)) {
            syncFs.copyFile(srcItemPath, destItemPath)
        }
    }
}

function readSingleKeypress() {
    return new Promise((resolve) => {
        process.stdin.setRawMode(true)

        process.stdin.resume()
        process.stdin.setEncoding('utf8')

        let keyPressed = null
        const noop = () => {}

        const cleanup = () => {
            process.stdin.setRawMode(false)
            resolve(null)
        }
        process.stdin.on('data', (data) => {
            if (keyPressed) return

            keyPressed = data.toString().trim().toLowerCase()
            process.stdin.setRawMode(false)
            process.stdin.removeListener('data', noop)
            process.stdin.removeListener('end', cleanup)
            resolve(keyPressed)
        })
        process.stdin.on('end', cleanup)
    })
}

try {
    setCliScript('REMAKE-ENGINE-CLI')
    const repoUrl = 'git+https://github.com/mstein77/remake-engine.git'
    const cmd = process.argv0 === 'npx' ? `npx ${repoUrl}` : 'node bin/remake.js'
    const { args } = extractOptionsAndArguments(
        {flags: {h: 'help'}, options: {'help': {desc: 'Show help'}}},
        `${cmd} [path-to-game-folder]`,
        'Sets up a new game either in the current directory or in the folder with the given path'
    )

    let currentDir = process.cwd()
    const enginePackage = 'remake-engine'
    const cwdPackageJsonPath = './package.json'

    let isCwdEngineDir = false
    if (syncFs.fileExists(cwdPackageJsonPath)) {
        let packageJson = syncFs.readJson(cwdPackageJsonPath)
        isCwdEngineDir = isObject(packageJson) && packageJson.name === enginePackage
    }
    const gameDirParam = args.length === 1 ? args[0] : ''
    const gameDirPath = gameDirParam.startsWith(syncFs.sep) ? gameDirParam : syncFs.join(currentDir, gameDirParam)

    let existingDir = gameDirPath
    while (!syncFs.exists(existingDir) && existingDir !== currentDir ) {
        const index = existingDir.lastIndexOf(syncFs.sep)
        if (index === -1) break

        existingDir = existingDir.slice(0, index)
    }
    existingDir = syncFs.realpath(existingDir)

    if (isCwdEngineDir && existingDir.startsWith(currentDir))
        throw Error('You cannot execute this script from the engine directory!')

    const gameDirName = syncFs.basename(gameDirPath)

    function gamePath(relPath) {
        return syncFs.join(gameDirPath, relPath)
    }

    const scriptBaseDir = syncFs.realpath(syncFs.join(dirname(fileURLToPath(import.meta.url)), '..'))
    const packageJsonPath = gamePath('package.json')
    let gameId = gameDirName
    let packageJson = undefined
    if (syncFs.fileExists(packageJsonPath)) {
        packageJson = syncFs.readJson(packageJsonPath)
        if (isObject(packageJson)) {
            gameId = packageJson.name
        }
    }

    mainSection(`Setting up new game...`)

    log(`Game ${bold(gameId)}`)
    newLine()

    if (args.length === 0) {
        subSection('Script was called without directory argument')
        let answer = null
        while (!['y', 'n'].includes(answer)) {
            subSectionWarning('Use the current directory as game folder? Please enter "y" or "n": ')
            try {
                answer =  await readSingleKeypress()
            } catch (e) {}
            if (answer === null) {
                throw Error('Could not read user input. Please try to call the script with a directory argument')
            }
        }
        if (answer === 'n') {
            subSectionError(`User declined`)
            process.exit(0)
        }
        subSectionOk()
    } else {
        subSection(`Checking existence of game directory ${bold(gameDirPath)} `)
        if (!syncFs.dirExists(gameDirPath)) {
            subSectionError('Missing, trying to create...')
            syncFs.mkdir(gameDirPath, {recursive: true})
        }
        subSectionOk()
    }
    newLine()

    subSection(`Checking availability of git repository`)
    if (!syncFs.dirExists(gamePath('.git'))) {
        subSectionError('missing, trying to create...')
        exec('git init', 0, { cwd: gameDirPath })
        newLine()
    }
    subSectionOk()
    newLine()

    subSection('Checking existence of package.json')
    if (!packageJson) {
        subSectionError('missing, trying to create...')
        exec('npm init -y', 0, { cwd: gameDirPath })
        packageJson = syncFs.readJson(packageJsonPath)
        newLine()
    }
    subSectionOk()
    newLine()

    subSection('Trying to parse package.json')
    if (!isObject(packageJson))
        throw Error(`Could not parse package.json!`)
    subSectionOk()
    newLine()

    subSection(`Checking if the ${enginePackage} package is installed`)
    const hasPackage = (packageJson.dependencies !== undefined && packageJson.dependencies[enginePackage] !== undefined)
    if (!hasPackage) {
        subSectionError('missing, trying to install...')
        exec(`npm install ${repoUrl}`, 0, { cwd: gameDirPath })
        packageJson = syncFs.readJson(packageJsonPath)
        newLine()
    }
    subSectionOk()
    newLine()

    subSection(`Checking if scripts are defined`)
    const hasScript = (packageJson.scripts !== undefined && packageJson.scripts.game !== undefined)
    if (!hasScript) {
        subSectionError('missing, trying to add...')
        if (packageJson.scripts === undefined) {
            packageJson.scripts = {}
        }
        const run = 'node run.cjs '
        packageJson.scripts.dev = run + 'build-game-dev'
        packageJson.scripts.game = run + 'build-game-dev'
        packageJson.scripts.build = run + 'build-game-dist'
        packageJson.scripts.pbuild = run + 'preview-build'
        packageJson.scripts.builds = run + 'build-game-dists'
        packageJson.scripts.start = run + 'start'
        packageJson.scripts.preview = run + 'preview'

        if (packageJson.type === undefined) {
            packageJson.type = 'module'
        }
        syncFs.writeJson(packageJsonPath, packageJson)
        packageJson = syncFs.readJson(packageJsonPath)
    }
    subSectionOk()
    newLine()

    subSection('Checking if module type is correct')
    const isModuleType = packageJson.type === 'module'
    if (!isModuleType) {
        subSectionError('wrong type found, trying to set to "module"...')
        packageJson.type = 'module'
        syncFs.writeJson(packageJsonPath, packageJson)
        packageJson = syncFs.readJson(packageJsonPath)
    }
    subSectionOk()

    // create files and folders
    const baseConfig = {
        "name": "{game.name} v{game.version}",
        "shortName": "{game.id}",
        "description": "{game.description}",
        "keywords": "{game.keywords}",
        "author": "{game.author}",
        "browsers": ">2.25%, not ie 11, not op_mini all",
        "editor": true,
        "gzip": true,
        "resourceLoading": "api",
        "apiMaxJsonSize": "10mb",
        "deploymentMethod": "checkout",
        "hosting": "server-with-nodejs",
        "deliverable": "web-app",
        "deliverableConfig": {},
        "targetPlatforms": "windows,android,apple",
        "targetServers": "express",
        "assetGeneration": "minimal",
        "assetTypes": "icon,tile,store,splash,icons",
        "assetsBgColor": "",
        "assetsPadding": 30,
        "minimize": false,
        "server": true,
        "https": false,
        "host": "localhost",
        "httpPort": 8080,
        "httpsPort": 443,
        "certificate": "",
        "path": "",
        "keepArtifacts": true,
        "restrictedCors": false,
        "sourceMaps": true,
        "sourceMapType": "eval-cheap-source-map",
        "openBrowser": "default",
        "staticTypes": "audio,video",
        "buildLogging": "normal",
        "clientLogging": "info",
        "serverLogging": "normal",
        "serverLoggingFormat": "dev",
        "stats": "normal",
        "envPrefix": "RMK_",
        "esLint": false,
        "dist": {
            "assetGeneration": "all",
            "minimize": true,
            "https": true
        }
    }
    mainSection('Create missing files and folders...')
    subSection('Create missing directories and files in game folder')
    addMissingDirsAndFiles(
        {
            // resource directories
            resources: {
                json: {},
                image: {},
                audio: {}
            },
            // assets directory
            assets: {},
            // source directory
            src: {
                screens: {}
            },
            // dist directory
            dist: {},
            // .npmrc file
            '.npmrc': "loglevel=silent",
            // .gitignore file
            '.gitignore': ["dist/", ".dist/", "dists/", "node_modules/", ".ssh", ".env"].join("\n"),
            // build.cjs file
            'build.cjs': "module.exports = " + JSON.stringify(baseConfig, null, 2),
            // run.cjs file
            'run.cjs': `const enginePackage = '${enginePackage}'
const path = require('node:path')
const { spawnSync } = require(\`./node_modules/\${enginePackage}/src/shared/console.cjs\`)

process.env.RMK_GAME_DIR = __dirname
const result = spawnSync(
    'npm',
    ['run', '--', ...process.argv.splice(2)],
    {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, 'node_modules/' + enginePackage)
    }
)
if (result.status !== 0) {
    process.exit(result.status)
}
`
        },
        gameDirPath + syncFs.sep
    )
    subSectionOk()
    newLine()

    // copy non-existing demo source files
    subSection('Copy missing demo source files')
    syncDirectories(
        syncFs.join(scriptBaseDir, 'src', 'build', 'demo-src'),
        gamePath('src')
    )
    subSectionOk()
    newLine()

    // trigger install of engine dependencies
    mainSection('Checking engine dependencies...')
    subSection('Checking if engine dependencies are installed')
    const engineBasePath = gamePath('node_modules/' + enginePackage)
    if (!syncFs.dirExists( engineBasePath + '/node_modules')) {
        subSectionError('Missing, trying to install...')
        exec('npm install', 0, { cwd: engineBasePath })
        newLine()
    }
    subSectionOk()
    newLine()

    mainSection('Successfully prepared game environment. Enjoy!')

    log(`You can start the game by running ${bold('npm run game')} in the game directory: ${bold(gameDirPath)}`)
    newLine()
    process.exit(0)
} catch (e) {
    errorSection(e)
}
