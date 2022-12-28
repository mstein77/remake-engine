const fs = require("fs")
const path = require("path")

const DEPLOY = {
    METHOD: {
        UPLOAD_ROOT: 'upload-dist-to-root',
        UPLOAD_PUBLIC: 'upload-dist-to-public',
        CHECKOUT: 'checkout'
    }
}
const RESOURCE = {
    LOADING: {
        LOCAL: 'local',
        STATIC: 'static',
        API: 'api'
    }
}

const RMK_GAME_DIR = process.env.RMK_GAME_DIR
const absDir = {
    engine: ( ...relPath ) => path.resolve( __dirname, '../../', ...relPath ),
    src: ( ...relPath ) => path.resolve(absDir.engine('src'), ...relPath ),
    game: ( ...relPath ) => path.resolve(absDir.engine(RMK_GAME_DIR ? RMK_GAME_DIR : '../../'), ...relPath ),
    resources: ( ...relPath ) => path.resolve(absDir.game( 'resources'), ...relPath ),
    dist: ( ...relPath ) => path.resolve(absDir.game('dist'), ...relPath ),
    tmp: ( ...relPath ) => path.resolve(absDir.engine('tmp'), ...relPath )
}

const configParams = {
    title: {type: 'string'},
    browsers: {type: 'string'},
    editor: {type: 'bool'},
    gzip: {type: 'bool'},
    resourceloading: {type: 'string', key: 'resourceLoading', values: Object.values(RESOURCE.LOADING)},
    apimaxjsonsize: {type: 'string', key: 'apiMaxJsonSize'},
    deployMethod: {type: 'string', key: 'deployMethod', values: Object.values(DEPLOY.METHOD)},
    hosting: {type: 'string'},
    minimize: {type: 'bool'},
    server: {type: 'bool'},
    baseUrl: {type: 'string', key: 'baseUrl'},
    sourcemaps: {type: 'bool', key: 'sourceMaps'},
    sourcemaptype: {type: 'string', key: 'sourceMapType'},
    openbrowser: {type: 'string', key: 'openBrowser'},
    port: {type: 'int'},
    logging: {type: 'string'},
    stats: {type: 'string'},
    envprefix: {type: 'string', key: 'envPrefix'}
}

require('dotenv').config({path: absDir.game('.env')})

const configJson = require(absDir.game('config.cjs'))

function extractEnvOverwrites(config, env) {
    let prefix = config.envPrefix
    if (!prefix || !env) return {}

    prefix = prefix.toLowerCase()
    const len = prefix.length
    const envOverwrites = {}
    for (let [name, value] of Object.entries(env)) {
        name = name.toLowerCase()
        if (!name.startsWith(prefix) || name.length <= len) continue
        const lcKey = name.substring(len)
        const configParam = configParams[lcKey]
        if (!configParam) continue
        switch (configParam.type) {
            case 'bool':
                if (['true', 'false'].includes(value.toLowerCase())) {
                    value = value[0].toLowerCase() === 't';
                }
                break;

            case 'int':
                value = parseInt(value, 10)
                break;
        }
        envOverwrites[configParam.key ? configParam.key : lcKey] = value
    }
    return envOverwrites
}

function extractAppEnvOverwrites(config, env) {
    const appEnv = env.APP_ENV
    const appEnvOverwrites = {}
    const keys = Object.keys(config)
    for (let key of keys) {
        const match = key.match(/^([a-z]+)\[([a-z]+)\]$/i)
        if (!match) continue
        const matchEnv = match[2]
        const matchKey = match[1]
        if (appEnv && matchEnv === appEnv) {
            appEnvOverwrites[matchKey] = config[key]
        }
        delete config[key]
    }
    return appEnvOverwrites
}

function getConfigForCtx(args) {
    const configArg = args && args.config
    const isDistBuild = (Array.isArray(configArg) && configArg.includes('webpack.build-dist.cjs'))
    const { dist, ...config } = configJson
    const envOverwrites = extractEnvOverwrites(config, process.env)
    const appEnvOverwrites = extractAppEnvOverwrites(config, process.env)

    let ctxConfig

    if (!isDistBuild || !dist) {
        ctxConfig = { ...config, ...appEnvOverwrites, ...envOverwrites }
    } else {
        for (let [key, value] of Object.entries(dist)) {
            if (key === 'envPrefix') continue
            config[key] = value
        }
        ctxConfig = { ...config, ...appEnvOverwrites, ...envOverwrites }
    }

    // validation
    for (const [ name, info ] of Object.entries(configParams)) {
        const { type, values, key = name } = info
        if (!values) continue
        const value = ctxConfig[key]
        if (!values.includes(value)) throw Error(`Value "${value}" not allowed for config key "${key}"! Allowed values: "${values.join('", "')}"`)
    }

    return ctxConfig
}

/**
 *  hosting: gibt den Hosting-Anbieter bzw. die Art des hostings
 *  deploy: gibt an auf welchen weg, die dist-dateien auf dem server ausgerollt werden soll (upload, checkout)
 *  server: gibt an, ob ein eigener node-js server gestartet werden soll (benötigt nodejs)
 *    - wird kein server gestartet, wird der http server des hosters verwendet
 *      und alle resourcen werden direkt von diesem geladen
 *  editor: gib an, ob ein editor mitgeliefert werden soll (deployment ist immer nur im DEV-Modus möglich)
 *  packageType: "webapp", "bundle", "pwa"
 *  resourceType: "raw", "base64"
 *
 *
 */
class Hosting {

    constructor(config, isDist) {
        this.config = config
        this.supports = {
            nodejs: true,
            manualUpload: true,
            checkout: true,
            pwa: true
        }
        this.isDist = isDist
        this.deployMethod = config.deployMethod
        this.editor = config.editor
        this.server = config.server
        this.messages = []
        this.copyPatterns = []

        this.init(config)

        this.cleanUp()

        if (isDist) {
            if (this.server && !this.supportsNodejs)
                this.throw('Server requires nodejs! Disable "server" in your dist config or use a hosting which supports nodejs!')
            if ([DEPLOY.METHOD.UPLOAD_PUBLIC, DEPLOY.METHOD.UPLOAD_ROOT].includes(config.deployMethod) && !this.supportsManualUpload)
                this.throw(`You selected "${config.deployMethod}" as deployment method, but your hosting does not support it, please change the hosting or deployMethod!`)
            if (this.deployMethod === DEPLOY.METHOD.CHECKOUT && !this.supportsCheckout)
                this.throw('You selected "checkout" as deployment method, but your hosting does not support it, please change the hosting or deployMethod!')

            const resourceDirs = ['audio', 'image', 'json']
            const rawResources = ['audio']

            const staticResources = (!this.server || config.resourceLoading === RESOURCE.LOADING.STATIC) ? [ ...resourceDirs ] : rawResources

            for (const dir of resourceDirs) {
                const from = absDir.resources(dir)
                if (syncFs.isEmptyDir(from)) continue
                this.copyPatterns.push({
                    from,
                    to: staticResources.includes(dir) ? this.publicDir + '/' + dir : absDir.dist('resources', dir)
                })
            }
            if (config.resourceLoading === RESOURCE.LOADING.API) {
                for (const file of ['indirect.json', 'direct.json']) {
                    const from = absDir.resources(file)
                    if (!syncFs.fileExists(from)) continue
                    this.copyPatterns.push({from, to: absDir.dist('resources', file) })
                }
            }
            if (this.deployMethod === DEPLOY.METHOD.UPLOAD_PUBLIC) {
                this.messages.push(`Upload the content of "${absDir.dist()}" to the public folder of your http web-server`)
            }
            if (this.server && [DEPLOY.METHOD.UPLOAD_ROOT, DEPLOY.METHOD.CHECKOUT].includes(this.deployMethod)) {
                const distPackageJsonPath = absDir.tmp('package.json')
                syncFs.writeJson(distPackageJsonPath, {
                    name: 'game',
                    version: '1.0.0',
                    dependencies: {
                        express: '^4.18.2'
                    }
                });
                this.copyPatterns.push({from: distPackageJsonPath, to: absDir.dist('package.json')})
                if (this.deployMethod === DEPLOY.METHOD.UPLOAD_ROOT) {
                    this.messages.push(`Upload the content of "${absDir.dist()}" to the document root folder of your http web-server`);
                    this.messages.push(`Afterwards execute "npm install" in this directory`);
                } else {
                    this.messages.push(`Checkout your game repo on your web server manually or automatically`);
                    this.messages.push(`Afterwards execute "npm start" in the root directory of your web server`);
                }
            }
            return
        }
        if (this.deployMethod === 'checkout') {
            this.generateRepoFiles()
        }
    }

    addCopyPattern(from, to) {
        if (syncFs.exists(from)) {
            this.copyPatterns.push({ from, to })
        }
    }

    cleanUp() {
        if (this.isDist) syncFs.clearDir(absDir.dist())
        syncFs.clearDir(absDir.tmp())
    }

    init(config) {}

    throw(msg) {
        throw new Error(msg)
    }

    writeFileContent(filePath, content) {}

    get supportsNodejs() {
        return this.supports.nodejs
    }

    get supportsManualUpload() {
        return this.supports.manualUpload
    }

    get supportsCheckout() {
        return this.supports.checkout
    }

    get publicDir() {
        return absDir.dist(this.server ? 'public' : '')
    }

    get postBuildMessage() {
        return this.messages.length ? this.messages.join("\n") : null
    }

    prepareForCopy() {}

    getCopyPatterns() {
        return this.copyPatterns
    }

    generateBuildFiles() {}

    generateRepoFiles() {}
}

const syncFs = {

    readFilesRec: (dirPath, relative = '', files = []) => {
        const currPath = path.resolve(dirPath, relative)
        const items = syncFs.readdir(currPath, {withFileTypes: true})
        for (let item of items) {
            if (item.isDirectory()) {
                syncFs.readFilesRec(dirPath, relative + item.name + '/', files)
            } else {
                files.push(relative + item.name)
            }
        }
        return files
    },

    readdir: ( ...args ) => {
        return fs.readdirSync( ...args )
    },

    unlink: filePath => fs.unlinkSync(filePath),

    rmDir: ( ...args ) => fs.rmSync( ...args ),

    clearDir: dirPath => {
        if (!syncFs.dirExists(dirPath)) return
        const items = syncFs.readdir(dirPath, {withFileTypes: true})
        for (let item of items) {
            const currPath = path.resolve(dirPath, item.name)
            if (item.isDirectory()) {
                syncFs.rmDir(currPath, {recursive: true, force: true})
            } else {
                syncFs.unlink(currPath)
            }
        }

    },

    isEmptyDir: dirPath => {
        if (!syncFs.dirExists(dirPath)) return true
        const items = syncFs.readdir(dirPath, {withFileTypes: true})
        return items.length === 0
    },

    fileExists: filePath => {
        try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) return false;
            return true
        } catch (err) {
            return false
        }
    },

    dirExists: dirPath => {
        try {
            const stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) return false;
            return true
        } catch (err) {
            return false
        }
    },

    exists: checkPath => {
        return syncFs.fileExists(checkPath) || syncFs.dirExists(checkPath)
    },

    readJson: filePath => {
        if (!syncFs.fileExists(filePath)) throw Error(`File not found: ${filePath}`);
        const rawdata = fs.readFileSync(filePath);
        const json = JSON.parse(rawdata);
        return json
    },

    readFile: ( ...args ) => fs.readFileSync( ...args ),

    writeContent: (filePath, content) => {
        fs.writeFileSync(filePath, content)
    },

    writeJson: (filePath, json, space = true) => {
        const data = JSON.stringify(json, undefined, space ? 4 : undefined);
        fs.writeFileSync(filePath, data);
    }
}

module.exports = {
    getConfigForCtx,
    Hosting,
    syncFs,
    absDir,
    RESOURCE,
    DEPLOY,
    configJson
}