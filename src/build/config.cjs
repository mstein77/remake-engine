const absPath = require('../shared/absPath.cjs')
const { d, simpleType, toValues, stringList, toPairs, intersect, isArray, csv2values } = require("../shared/helper.cjs")
const { buildLogLevels, getBuildLogLevel} = require("../shared/console.cjs")
const { execSync, NoStackError } = require("../shared/console.cjs")
let crypto
try {
    crypto = require('node:crypto')
} catch (e) {}

const MSG = {
    noServer: `The editor was enabled but requires a server build, please enable "server" or disable "editor"`,
    enableEditor: `Editor was deactivated in the config, but is required in the dev build, that's why "editor" was set to true`,
    allStaticApi: `Requested resourceLoading "api" replaced with "static-all" because "staticTypes" include all types`,
    localToApi: `Requested resourceLoading "local" not supported in dev or editor environment, using "api" instead`,
    localAllToApi: `Requested resourceLoading "local-all" not supported in dev or editor environment, using "api" instead`,
    simStaticAll: `Requested resourceLoading "static-all" not supported in dev or editor environment, switching to simulation using "api"`,
    noServerNodejs: `Enabling of "server" not possible because your hosting is set to "server-without-nodejs" and does not support nodejs`
}
const DEPLOYMENT_METHOD = {
    UPLOAD_ROOT: 'upload-dist-to-root',
    UPLOAD_PUBLIC: 'upload-dist-to-public',
    CHECKOUT: 'checkout'
}
const RESOURCE_LOADING = {
    API: 'api',
    API_ALL: 'api-all',
    LOCAL: 'local',
    LOCAL_ALL: 'local-all',
    STATIC_ALL: 'static-all'
}
const DELIVERABLE = {
    PWA: 'pwa',
    HTML_FILE: 'html-file',
    APP_MAC: 'mac-app',
    EXE_JAVA: 'exe.java',
    APP_WEB: 'web-app',
    APP_UWP: 'uwp-app',
    APP_ELECTRON: 'electron-app'
}
const HOSTING = {
    AWS: 'aws',
    HEROKU: 'heroku',
    SERVER_WITH_NODEJS: 'server-with-nodejs',
    SERVER_WITHOUT_NODEJS: 'server-without-nodejs'
}
const PLATFORMS = {
    WINDOWS: 'windows',
    WINDOWS_11: 'windows.11',
    WINDOWS_10: 'windows.10',
    ANDROID: 'android',
    APPLE: 'apple',
    IOS: 'apple.ios',
    MACOS: 'apple.macos',
    LINUX: 'linux',
    ALL: 'all'
}
const ASSET_GENERATION = {
    NONE: 'none',
    MINIMAL: 'minimal',
    RECOMMENDED: 'recommended',
    ALL: 'all'
}
const ASSET_TYPE = {
    ICON: 'icon',
    TILE: 'tile',
    STORE: 'store',
    SPLASH: 'splash',
    ICNS: 'icons'
}
const configKey2params = {
    name: {type: 'string', default: '{game.name} v{game.version}'},
    shortName: {type: 'string', default: '{game.id}'},
    description: {type: 'string', default: '{game.description}'},
    keywords: {type: 'csv', default: '{game.keywords}'},
    author: {type: 'string', default: '{game.author}'},
    browsers: {type: 'string', default: '>2.25%, not ie 11, not op_mini all'},
    editor: {type: 'bool', default: true, distDefault: false},
    gzip: {type: 'bool', default: true},
    resourceLoading: {type: 'string', values: toValues(RESOURCE_LOADING), default: RESOURCE_LOADING.API},
    apiMaxJsonSize: {type: 'string', default: '10mb'},
    deploymentMethod: {type: 'string', values: toValues(DEPLOYMENT_METHOD), default: DEPLOYMENT_METHOD.CHECKOUT},
    hosting: {type: 'string', default: HOSTING.SERVER_WITH_NODEJS, values: toValues(HOSTING)},
    deliverable: {type: 'string', default: DELIVERABLE.APP_WEB, values: toValues(DELIVERABLE)},
    deliverableConfig: {type: 'json', default: {}},
    targetPlatforms: {type: 'csv', default: `${PLATFORMS.WINDOWS},${PLATFORMS.ANDROID},${PLATFORMS.APPLE}`, values: toValues(PLATFORMS)},
    targetServers: {type: 'csv', default: 'express'},
    assetGeneration: {type: 'string', default: ASSET_GENERATION.MINIMAL, values: toValues(ASSET_GENERATION), distDefault: ASSET_GENERATION.ALL},
    assetTypes: {type: 'csv', values: toValues(ASSET_TYPE), default: toValues(ASSET_TYPE).join(',')},
    assetsBgColor: {type: 'string', default: ''},
    assetsPadding: {type: 'int', default: 30},
    minimize: {type: 'bool', default: false, distDefault: true},
    server: {type: 'bool', default: true},
    https: {type: 'bool', default: false, distDefault: true},
    host: {type: 'string', default: 'localhost'},
    httpPort: {type: 'uint', default: 8080},
    httpsPort: {type: 'uint', default: 443},
    certificate: {type: 'string', default: ''},
    path: {type: 'string', default: ''},
    keepArtifacts: {type: 'bool', default: true},
    restrictedCors: {type: 'boolean', default: false},
    sourceMaps: {type: 'bool', default: true, distDefault: false},
    sourceMapType: {type: 'string', default: 'eval-cheap-source-map'},
    openBrowser: {type: 'string', default: 'default'},
    staticTypes: {type: 'string', default: 'audio,video'},
    buildLogging: {type: 'string', default: 'normal', values: buildLogLevels},
    clientLogging: {type: 'string', default: 'info'},
    serverLogging: {type: 'string', default: 'normal', values: buildLogLevels},
    serverLoggingFormat: {type: 'string', default: 'dev'},
    stats: {type: 'string', default: 'normal'},
    envPrefix: {type: 'string', default: 'RMK_'},
    esLint: {type: 'bool', default: false}
}

const buildDefaults = (key2params, addDist = false) => {
    const json = {}
    const dist = {}
    for (const [ key, params ] of toPairs(key2params)) {
        json[key] = params.default
        if (!params.distDefault) continue

        dist[key] = params.distDefault
    }
    if (addDist) json.dist = dist

    return json
}

const assertSimpleType = (key, value, type, context) => {
    const actType = simpleType(value)
    if (actType !== type)
        throw NoStackError(`Expected key "${key}" in ${context} to have type "${type}" but got "${actType}"`)
}

const validateConfig = (config, key2params, context) => {
    const lcKey2param = {}
    for (const [ key, param ] of toPairs(key2params)) {
        if (param.key) lcKey2param[key.toLowerCase()] = param
    }
    for (const [ key, value ] of toPairs(config)) {
        let param = key2params[key] ? key2params[key] : lcKey2param[key]
        if (!param)
            throw NoStackError(`Unknown key "${key}" given in ${context}`)

        const { type, values, subType } = param
        switch (type) {

            case 'string':
                assertSimpleType(key, value, 'string', context)
                if (values && !values.includes(value))
                    throw NoStackError(`Invalid value "${value}" given for key "${key}" in ${context}. Allowed values: ${stringList(values)}`)
                break

            case 'array':
                assertSimpleType(key, value, 'array', context)
                if (subType) {
                    for (const item of value) {
                        const actType = simpleType(item)
                        if (actType !== subType)
                            throw NoStackError(`Expected all array values for key "${key}" in ${context} to have type ${subType} but found ${actType}`)
                    }
                }
                break

            case 'csv':
                assertSimpleType(key, value, 'string', context)
                if (values) {
                    const items = csv2values(value)
                    for (const item of items) {
                        if (!values.includes(item))
                            throw NoStackError(`Invalid value "${item}" found in csv string for key "${key}" in ${context}. Allowed values: ${stringList(values)}`)
                    }
                }
                break

            case 'bool':
                assertSimpleType(key, value, 'boolean', context)
                break

            case 'uint':
                assertSimpleType(key, value, 'number', context)
                if (value < 0)
                    throw Error(`Expected value "${value}" for key "${key}" in ${context} to be unsigned`)
                break

            case 'json':
                assertSimpleType(key, value, 'object', context)
                break
        }
    }
}

/**
 * Returns an unresolved config object with default values for dev and dist environment
 *
 * @returns {object}
 */
const getDefaultConfig = () => buildDefaults(configKey2params, true)

/**
 * Returns a resolved config object with default values for dist or dev environment
 *
 * @param {boolean} isDist
 *
 * @returns {object}
 */
const getResolvedDefaultConfig = isDist => {
    const json = {}
    for (const [ key, params ] of toPairs(configKey2params)) {
        json[key] = isDist && params.distDefault !== undefined ? params.distDefault : params.default
    }
    return json
}

const configParams = {}
for (const [ key, params ] of toPairs(configKey2params)) {
    const lcKey = key.toLowerCase()
    if (lcKey !== key) params.key = key
    configParams[lcKey] = params
}

require('dotenv').config({path: absPath.game('.env')})

let buildJsonContent = null

/**
 * Returns an object contained in the build.cjs of the game directory
 *
 * @returns {object}
 */
const buildJson = () => {
    if (!buildJsonContent) buildJsonContent = require(absPath.game('build.cjs'))

    return buildJsonContent
}

/**
 * Runs integrity checks for production or development environment on the given config and might change config
 * settings in this process. Also instantiates the hosting and deliverable classes which are given in the resulting
 * config before all of these are returned in a json object which also holds all warnings which happened during the
 * checks. Throws an error if a failed integrity check could not be resolved
 *
 * @param {object} config
 * @param {object} fileDeps
 * @param {object} options
 *
 * @returns {object}
 */
const runConfigIntegrityChecks = (config, fileDeps, options) => {
    const { isDist, all } = options
    const { absPath, syncFs } = fileDeps
    const warnings = []

    if (!isDist) {
        // in development mode
        if (!config.server) {
            warnings.push(`Requested no server but the server is required in dev environment, using server instead`)
            config.server = true
        }
        if (!config.editor) {
            warnings.push(`Requested no editor but the editor is required in dev environment, using editor instead`)
            config.editor = true
        }
        const key2devValue = {
            deliverable: DELIVERABLE.APP_WEB,
            hosting: HOSTING.SERVER_WITH_NODEJS,
            resourceLoading: RESOURCE_LOADING.API,
            deploymentMethod: DEPLOYMENT_METHOD.CHECKOUT
        }
        for (const [ key, value ] of toPairs(key2devValue)) {
            if (config[key] === value) continue
            warnings.push(`Requested ${key} "${config.deliverable}" not supported in dev environment, using "${value}" instead`)
            config[key] = value
        }
    }
    if (config.deploymentMethod === DEPLOYMENT_METHOD.UPLOAD_PUBLIC && config.server) {
        warnings.push(`Requested server "true" but is not supported by the deployment method "${DEPLOYMENT_METHOD.UPLOAD_PUBLIC}", using "false" instead`)
        config.server = false
    }
    if (config.editor && !config.server)
        throw NoStackError(MSG.enableEditor)

    const Deliverable = require(`./deliverables/${config.deliverable}.cjs`)
    const deliverable = new Deliverable(config.deliverableConfig)
    const Hosting = require(`./hostings/${config.hosting}.cjs`)
    const hosting = new Hosting()

    if (config.server && !hosting.supportsNodeJs)
        throw NoStackError(MSG.noServerNodejs)

    let supported = deliverable.supportsResourceLoading(config.resourceLoading)
    if (supported === false)
        throw NoStackError(
            `Requested resourceLoading "${config.resourceLoading}" is not supported by deliverable "${config.deliverable}"`
        )

    if (supported !== true) {
        warnings.push(
            `Requested resourceLoading "${config.resourceLoading}" is not supported by deliverable "` +
            `${config.deliverable}", using "${supported}" instead`
        )
        config.resourceLoading = supported
    }
    supported = hosting.supportsDeploymentMethod(config.deploymentMethod)
    if (supported === false)
        throw NoStackError(`Requested deploymentMethod "${config.deploymentMethod}" is not supported by hosting "${config.hosting}", ` +
            `please change the hosting or deploymentMethod`
        )
    if (supported !== true) {
        warnings.push(`Requested deploymentMethod "${config.deploymentMethod}" is not supported by hosting "${config.hosting}", ` +
            `using "${supported}" instead`
        )
        config.deploymentMethod = supported
    }
    supported = deliverable.supportsAssetGeneration(config.icons)
    if (supported === false)
        throw NoStackError(`Requested assetGeneration value "${config.assetGeneration}" is not supported by deliverable "${config.deliverable}"`)
    if (supported !== true) {
        warnings.push(`Requested assetGeneration value "${config.assetGeneration}" is not supported by deliverable "${config.deliverable}", ` +
            `using "${supported}" instead`
        )
        config.icons = supported
    }

    const allTypes = ['json', 'image', 'audio', 'video']
    const currStaticTypes = csv2values(config.staticTypes)
    const staticTypes = []
    if (![RESOURCE_LOADING.LOCAL_ALL, RESOURCE_LOADING.API_ALL].includes(config.resourceLoading)) {
        if (!config.server || config.resourceLoading === RESOURCE_LOADING.STATIC_ALL) {
            staticTypes.push( ...allTypes )
        } else if (config.staticTypes !== '') {
            staticTypes.push( ...currStaticTypes )
        }
    }
    config.staticTypes = staticTypes.join(',')

    // TODO check the following staticTypes checks
    const allStaticTypes = intersect(allTypes, staticTypes).length === allTypes.length
    if (allStaticTypes && config.resourceLoading === RESOURCE_LOADING.API) {
        warnings.push(MSG.allStaticApi)
        config.resourceLoading = RESOURCE_LOADING.STATIC_ALL
    }
    if (config.editor && [RESOURCE_LOADING.LOCAL, RESOURCE_LOADING.LOCAL_ALL].includes(config.resourceLoading)) {
        warnings.push(config.resourceLoading === RESOURCE_LOADING.LOCAL ? MSG.localToApi : MSG.localAllToApi)
        config.resourceLoading = RESOURCE_LOADING.API
    }
    if (config.editor && config.resourceLoading === RESOURCE_LOADING.STATIC_ALL) {
        warnings.push(MSG.simStaticAll)
    }
    if (!isDist && config.https) {
        const sslPath = absPath.game('.ssl')
        const certFilePath = absPath.make(sslPath, 'cert.pem')
        const keyFilePath = absPath.make(sslPath, 'key.pem')
        const hasCertFiles = syncFs.fileExists(certFilePath) && syncFs.fileExists(keyFilePath)
        let generate = !hasCertFiles
        if (hasCertFiles && crypto) {
            const cert = syncFs.readFile(certFilePath)
            const parsedCert = new crypto.X509Certificate(cert)
            const validFrom = (new Date(parsedCert.validFrom)).getTime()
            const validTo = (new Date(parsedCert.validTo)).getTime()
            const currentDate = new Date().getTime()
            if (currentDate < validFrom || currentDate > validTo) generate = true
        }
        if (generate) {
            // check for open-ssl
            const hasOpenSsl = execSync(`openssl version`, {print: false}).failed === false
            let useHttp = !hasOpenSsl
            if (hasOpenSsl) {
                // generate
                syncFs.createPathTo(sslPath + '/')
                const makeCert = execSync(
                    `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem ` +
                    `-subj "/C=DE/ST=State/L=Location/O=Organization/OU=Organizational Unit/CN=example.com"`,
                    {cwd: sslPath}
                )
                if (makeCert.failed) useHttp = true
            }
            if (useHttp) {
                warnings.push(`No openssl could be found to generate certificates for https, please install. Falling back to http`)
                config.https = false
            }
        }
    }
    if (config.buildLogging !== getBuildLogLevel()) {
        warnings.push(`Requested buildLogging "${config.buildLogging}" but logging was overwritten, so using "${getBuildLogLevel()}" instead`)
        config.buildLogging = getBuildLogLevel()
    }
    if (all && config.serverLogging !== config.buildLogging) {
        warnings.push(`Requested serverLogging "${config.serverLogging}" but cli flag "all" was set, so using "${config.buildLogging}" instead`)
        config.serverLogging = config.buildLogging
    }

    // end

    /*
    if ([DEPLOYMENT_METHOD.UPLOAD_PUBLIC, DEPLOYMENT_METHOD.UPLOAD_ROOT].includes(config.deploymentMethod) && !hosting.supportsManualUpload)
        throw Error(`Requested deploymentMethod "${config.deploymentMethod}" is not supported by hosting "${config.hosting}", please change the hosting or deploymentMethod!`)

        if (config.deploymentMethod === DEPLOYMENT_METHOD.CHECKOUT && !hosting.supportsCheckout)
            throw Error('You selected "checkout" as deployment method, but your hosting does not support it, please change the hosting or deploymentMethod!')
    }
     */
    return {
        config,
        warnings,
        deliverable,
        hosting
    }
}

/**
 * Casts an environment string value to the given type representation and returns it
 * Throws an error if the value is not a string or the requested type does not exist
 *
 * @param {string} type The type (bool, int, uint, string)
 * @param {string} value The environment value string
 * @param {string|undefined} context
 *
 * @returns {mixed}
 */
const castEnvValue = (type, value, context) => {
    if (typeof value !== 'string')
        throw Error(`Env value to be casted has type ${typeof value} but must be string!` )

    switch (type) {
        case 'bool':
            const lcValue = value.toLowerCase()
            if (['true', 'on', '1'].includes(lcValue)) {
                return true
            }
            if (['false', 'off', '0'].includes(lcValue)) {
                return false
            }
            break

        case 'int':
            if (!value.match(/^\-?[0-9]+$/)) break
            const int = parseInt(value, 10)
            if (Number.isNaN(int)) break
            return int

        case 'uint':
            if (!value.match(/^[0-9]+$/)) break
            const uint = parseInt(value, 10)
            if (Number.isNaN(uint)) break
            return uint

        case 'csv':
        case 'string':
            return value

        case 'json':
            if (isString(value)) {
                value = value === '' ? {} : JSON.parse(value)
            }
            if (!isObject(value)) break

            return value

        default:
            throw NoStackError(`Unknown type ${type} requested for casting environment value` + (context ? ` [${context}]` : ''))
    }
    throw NoStackError(`Environment value "${value}" cannot be cast to ${type}!` + (context ? ` [${context}]` : ''))
}

/**
 * Returns an object holding all config overwrites in the given environment variables
 * If no envPrefix was set in the config, no overwrites will be extracted. Underscores
 * after the envPrefix will be removed in each env key. Config keys are returned
 * camel-cased and the values are cast and validated against their type
 *
 * @param {object} config The build config json
 * @param {object} env The environment variables
 *
 * @returns {object}
 */
const extractEnvOverwrites = (config, env) => {
    let prefix = config.envPrefix
    if (!prefix || !env) return {}

    prefix = prefix.toLowerCase()
    const len = prefix.length
    const envOverwrites = {}
    for (let [name, value] of Object.entries(env)) {
        name = name.toLowerCase()
        if (!name.startsWith(prefix) || name.length <= len) continue
        const lcKey = name.substring(len).replaceAll('_', '')
        const configParam = configParams[lcKey]
        if (!configParam) continue
        envOverwrites[configParam.key ? configParam.key : lcKey] = castEnvValue(configParam.type, value)
    }
    return envOverwrites
}

/**
 * Returns an object with all keys of the given config which have an environment matcher (...[<APP_ENV>])
 * matching the environment value in APP_ENV
 *
 * @param {object} config
 * @param {object} env
 *
 * @returns {object}
 */
function extractAppEnvOverwrites(config, env) {
    const { APP_ENV } = env
    const appEnvOverwrites = {}
    if (!APP_ENV) return appEnvOverwrites

    const keys = Object.keys(config)
    for (let key of keys) {
        const match = key.match(/^([a-z]+)\[([a-z]+)\]$/i)
        if (!match) continue
        const matchEnv = match[2]
        const matchKey = match[1]
        if (matchEnv === APP_ENV) {
            appEnvOverwrites[matchKey] = config[key]
        }
        delete config[key]
    }
    return appEnvOverwrites
}

/**
 * Returns a config object with all resolved config keys and values either for a dev or a dist build
 *
 * @param {object} json The content of the build.cjs
 * @param {object} env The environment variables
 * @param {object} overwrites The dist overwrites
 * @param {boolean} isDistBuild
 *
 * @returns {object}
 */
const buildConfig = (json, env, overwrites, isDistBuild) => {
    const { dist, ...config } = json
    const envOverwrites = extractEnvOverwrites(config, env)
    const appEnvOverwrites = extractAppEnvOverwrites(config, env)

    let ctxConfig
    const defaultConfig = getResolvedDefaultConfig(isDistBuild)
    if (!isDistBuild || !dist) {
        ctxConfig = { ...defaultConfig, ...config, ...appEnvOverwrites, ...envOverwrites }
    } else {
        for (let [key, value] of Object.entries(dist)) {
            if (key === 'envPrefix') continue
            config[key] = value
        }
        ctxConfig = { ...defaultConfig, ...config, ...appEnvOverwrites, ...envOverwrites, ...overwrites }
    }
    validateConfig(ctxConfig, configKey2params, 'build config')

    return ctxConfig
}

/**
 * Returns the game config for production or development environment depending on the given webpack arguments
 *
 * @param {object|array} args
 * @param {object} overwrites
 *
 * @returns {object}
 */
const getConfigForCtx = (args, overwrites = {}) => {
    const configArg = args && args.config
    const isDistBuild = isArray(configArg) && configArg.includes('webpack.build-dist.cjs')
    return buildConfig(buildJson(), process.env, overwrites, isDistBuild)
}

const getPreviewConfigs = (fileDeps, overwrites = {}) => {
    let distConfig = getConfigForCtx({config: ['webpack.build-dist.cjs']}, overwrites)
    const { deliverable, hosting, config } = runConfigIntegrityChecks(distConfig, fileDeps, {isDist: true})
    distConfig = config

    let devConfig = getConfigForCtx()
    {
        const { config } = runConfigIntegrityChecks(devConfig, fileDeps, {idDist: false})
        devConfig = config
    }
    return {
        distConfig,
        devConfig,
        deliverable,
        hosting
    }
}

const internal = process.env.NODE_ENV !== 'test' ? {} : {
    MSG,
    extractEnvOverwrites,
    castEnvValue,
    extractAppEnvOverwrites
}

module.exports = {
    buildConfig,
    getPreviewConfigs,
    validateConfig,
    buildDefaults,
    runConfigIntegrityChecks,
    getConfigForCtx,
    ASSET_TYPE,
    HOSTING,
    PLATFORMS,
    DEPLOYMENT_METHOD,
    RESOURCE_LOADING,
    DELIVERABLE,
    ASSET_GENERATION,
    getResolvedDefaultConfig,
    getDefaultConfig,
    internal
}