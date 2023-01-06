const absPath = require('./absPath.cjs')

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

const key2params = {
    title: {type: 'string'},
    browsers: {type: 'string'},
    editor: {type: 'bool'},
    gzip: {type: 'bool'},
    resourceLoading: {type: 'string', values: Object.values(RESOURCE.LOADING)},
    apiMaxJsonSize: {type: 'string'},
    deployMethod: {type: 'string', values: Object.values(DEPLOY.METHOD)},
    hosting: {type: 'string'},
    minimize: {type: 'bool'},
    server: {type: 'bool'},
    baseUrl: {type: 'string'},
    sourceMaps: {type: 'bool'},
    sourceMapType: {type: 'string'},
    openBrowser: {type: 'string'},
    port: {type: 'uint'},
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

const getConfigForCtx = args => {
    const configArg = args && args.config
    const isDistBuild = (Array.isArray(configArg) && configArg.includes('webpack.build-dist.cjs'))
    return buildConfig(configJson(), process.env, isDistBuild)
}

const internal = process.env.NODE_ENV === 'test' ? {
    buildConfig,
    extractEnvOverwrites,
    castEnvValue,
    extractAppEnvOverwrites } : {}

module.exports = {
    getConfigForCtx,
    configJson,
    internal,
    DEPLOY,
    RESOURCE
}
