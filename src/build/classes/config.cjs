const absPath = require('../../shared/classes/absPath.cjs')
const { d, intersect, isArray } = require("../../shared/classes/helper.cjs")
const { DEPLOY_METHOD, RESOURCE_LOADING } = require('../classes/const.cjs')
const { colorLog, FG } = require("../../shared/classes/color.cjs")

const heroku = require("../hosting/heroku.cjs")
const serverWithNode = require("../hosting/server-with-nodejs.cjs")
const serverWithoutNode = require("../hosting/server-without-nodejs.cjs")

const hosting2cls = {
    'heroku': heroku,
    'server-with-nodejs': serverWithNode,
    'server-without-nodejs': serverWithoutNode
}

const MSG = {
    noServer: `The editor was enabled but requires a server build, please enable "server" or disable "editor"`,
    enableEditor: `Editor was deactivated in the config, but is required in the dev build, that's why "editor" was set to true`,
    allStaticApi: `Requested resourceLoading "api" replaced with "static-all" because "staticTypes" include all types`,
    localToApi: `Requested resourceLoading "local" not supported in dev or editor environment, using "api" instead`,
    localAllToApi: `Requested resourceLoading "local-all" not supported in dev or editor environment, using "api" instead`,
    simStaticAll: `Requested resourceLoading "static-all" not supported in dev or editor environment, switching to simulation using "api"`,
    noServerNodejs: `Enabling of "server" not possible because your hosting is set to "server-without-nodejs" and does not support nodejs`
}

const key2params = {
    title: {type: 'string'},
    browsers: {type: 'string'},
    editor: {type: 'bool'},
    gzip: {type: 'bool'},
    resourceLoading: {type: 'string', values: Object.values(RESOURCE_LOADING)},
    apiMaxJsonSize: {type: 'string'},
    deployMethod: {type: 'string', values: Object.values(DEPLOY_METHOD)},
    hosting: {type: 'string'},
    minimize: {type: 'bool'},
    server: {type: 'bool'},
    baseUrl: {type: 'string'},
    sourceMaps: {type: 'bool'},
    sourceMapType: {type: 'string'},
    openBrowser: {type: 'string'},
    port: {type: 'uint'},
    staticTypes: {type: 'string'},
    logging: {type: 'string'},
    stats: {type: 'string'},
    envPrefix: {type: 'string'}
}
const configParams = {}
for (const [ key, params ] of Object.entries(key2params)) {
    const lcKey = key.toLowerCase()
    if (lcKey !== key) params.key = key
    configParams[lcKey] = params
}

require('dotenv').config({path: absPath.game('.env')})

let configJsonContent = null

const configJson = () => {
    if (!configJsonContent) configJsonContent = require(absPath.game('config.cjs'))
    return configJsonContent
}

/**
 * Returns an object holding the config after applying all integrity checks and all errors and
 * warnings which happened during the check
 *
 * @param {object} config
 * @param {boolean} isDist
 *
 * @returns {object}
 */
const applyConfigIntegrityChecks = (config, isDist) => {
    const warnings = []

    if (config.editor && !config.server)
        throw Error(MSG.noServer)

    if (!isDist && config.editor === false) {
        warnings.push(MSG.enableEditor)
        config.editor = true
    }

    if (isDist && config.server && !(new hosting2cls[config.hosting]()).supportsNodejs)
        throw Error(MSG.noServerNodejs)

    const staticTypes = config.staticTypes === '' ? [] : config.staticTypes.split(',')
    const allStaticTypes = intersect(['json', 'audio', 'image', 'video'], staticTypes).length === 4
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

    return {
        config,
        warnings
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

        case 'string':
            return value

        default:
            throw Error(`Unknown type ${type} requested for casting environment value` + (context ? ` [${context}]` : ''))
    }
    throw Error(`Environment value "${value}" cannot be cast to ${type}!` + (context ? ` [${context}]` : ''))
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
 * @param {object} json The content of the config.cjs
 * @param {object} env The environment variables
 * @param {boolean} isDistBuild
 *
 * @returns {object}
 */
const buildConfig = (json, env, isDistBuild) => {
    const { dist, ...config } = json
    const envOverwrites = extractEnvOverwrites(config, env)
    const appEnvOverwrites = extractAppEnvOverwrites(config, env)

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

let ctxConfig = null

const getConfigForCtx = args => {
    if (ctxConfig === null) {
        const configArg = args && args.config
        const isDistBuild = isArray(configArg) && configArg.includes('webpack.build-dist.cjs')
        const rawConfig = buildConfig(configJson(), process.env, isDistBuild)
        console.log()
        console.log('Checking integrity of config...')
        const { config, error, warnings} = applyConfigIntegrityChecks(rawConfig, isDistBuild)
        if (warnings.length) {
            colorLog(FG.YELLOW + `...there are warnings:`);
            console.log()
            while (warnings.length) {
                colorLog(FG.L_YELLOW + ` WARNING ` + FG.WHITE + warnings.pop())
            }
        } else {
            colorLog(FG.GREEN + `...ok!`)
        }
        console.log()
        console.log(
            `Building game in ` + (isDistBuild ? 'dist folder' : 'develop mode') +
            ` with the following config:`,
            config
        )
        console.log()
        ctxConfig = config
    }
    return ctxConfig
}

const internal = process.env.NODE_ENV === 'test' ? {
    MSG,
    buildConfig,
    applyConfigIntegrityChecks,
    extractEnvOverwrites,
    castEnvValue,
    extractAppEnvOverwrites } : {}

module.exports = {
    applyConfigIntegrityChecks,
    getConfigForCtx,
    configJson,
    internal
}
