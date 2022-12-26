const fs = require("fs")
const path = require("path")

const absDir = {
    engine: ( ...relPath ) => path.resolve( __dirname, '../../', ...relPath ),
    src: ( ...relPath ) => path.resolve(absDir.engine('src'), ...relPath ),
    game: ( ...relPath ) => path.resolve(absDir.engine('../../'), ...relPath ),
    resources: ( ...relPath ) => path.resolve(absDir.game( 'resources'), ...relPath ),
    dist: ( ...relPath ) => path.resolve(absDir.game('dist'), ...relPath ),
    tmp: ( ...relPath ) => path.resolve(absDir.engine('tmp'), ...relPath )
}

const configParams = {
    title: {type: 'string'},
    browsers: {type: 'string'},
    editor: {type: 'bool'},
    touch: {type: 'bool'},
    gzip: {type: 'bool'},
    resources: {type: 'string'},
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
    if (!isDistBuild || !dist) return { ...config, ...appEnvOverwrites, ...envOverwrites }

    for (let [key, value] of Object.entries(dist)) {
        if (key === 'envPrefix') continue
        config[key] = value
    }
    return { ...config, ...appEnvOverwrites, ...envOverwrites }
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
            if (this.deployMethod === 'upload' && !this.supportsManualUpload)
                this.throw('You selected "upload" as deployment method, but your hosting does not support it, please change the hosting or deployMethod!')
            if (this.deployMethod === 'checkout' && !this.supportsCheckout)
                this.throw('You selected "checkout" as deployment method, but your hosting does not support it, please change the hosting or deployMethod!')

            const resourceDirs = ['audio', 'image', 'json']
            const rawResources = ['audio']

            const staticResources = (!this.server || config.resources === 'static') ? [ ...resourceDirs ] : rawResources

            for (let dir of resourceDirs) {
                this.copyPatterns.push({
                    from: absDir.resources(dir),
                    to: staticResources.includes(dir) ? this.publicDir + '/' + dir : absDir.dist('resources', dir)
                })
            }
            if (this.deployMethod === 'upload') {
                this.messages.push(`Upload the content of "${absDir.dist()}" to the public folder of your http web-server`)
            }
            return
        }
        if (this.deployMethod === 'checkout') {
            this.generateRepoFiles()
        }
    }

    cleanUp() {
        const path = absDir.tmp('instructions.txt')
        syncFs.writeContent(path, '')
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
        return null
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

    readJson: filePath => {
        if (!syncFs.fileExists(filePath)) throw Error(`File not found: ${filePath}`);
        const rawdata = fs.readFileSync(filePath);
        const json = JSON.parse(rawdata);
        return json
    },

    readFile: filePath => fs.readFileSync(filePath),

    writeContent: (filePath, content) => {
        fs.writeFileSync(filePath, content)
    },

    writeJson: (filePath, json, space = true) => {
        const data = JSON.stringify(json, undefined, space ? 4 : undefined);
        fs.writeFileSync(filePath, data);
    }
}

const getFileNameForHosting = name => {
    return 'server-with-nodejs.cjs'
}

module.exports = {
    getConfigForCtx,
    Hosting,
    syncFs,
    absDir,
    configJson,
    getFileNameForHosting
}