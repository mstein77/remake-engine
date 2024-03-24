const syncFs = require("../shared/syncFs.cjs")
const { d, isObject, simpleType, toPairs} = require("../shared/helper.cjs")
const { NoStackError } = require("../shared/console.cjs")

/**
 * Returns the object of the given json file path. Throws an error if the file does not exist, if the JSON is invalid
 * or if the json is not of type object
 * 
 * @param {string} path
 *
 * @returns {object}
 */
const getJsonObjectFromFile = path => {
    const json = syncFs.readJson(path)
    if (!isObject(json))
        throw NoStackError(`Json in file ${path} must be an object but got ${typeof json}`)

    return json
}

/**
 * Requires the module given by the path and returns default value of this module if it is of the expected simple type.
 * Throws an error otherwise. If the required flag is not set undefined is returned if the file does not exist
 * 
 * @param {string} path
 * @param {string} expectedType
 * @param {boolean} required
 * 
 * @returns {mixed}
 */
const getDefaultFromModule = (path, expectedType = 'object', required = true) => {
    if (!syncFs.fileExists(path)) {
        if (!required) return
        throw NoStackError(`Missing required file ${path}`)
    }
    let json
    try {
        json = require(path)
    } catch (e) {
        if (e instanceof SyntaxError) {
            e.message = `Error parsing config file ${path}: ` + e.message
        }
        throw e
    }
    if (simpleType(json) !== expectedType)
        throw NoStackError(`The file ${path} must return an ${expectedType} in module.exports but got ${simpleType(json)}`)

    return json
}

/**
 * Returns a copy of the given object where all values are stringified
 *
 * @param {object} obj
 *
 * @returns {object}
 */
const stringifyValues = obj => {
    const stringified = {}
    for (const [ id, value ] of toPairs(obj)) {
        stringified[id] = JSON.stringify(value)
    }
    return stringified
}

getReplaceMetaVars = (metaVars, configVars = {}) => {
    return value => {
        for (let [ key, replacement ] of toPairs(configVars)) {
            value = value.replaceAll(`{${'config.' + key}}`, replacement)
        }
        for (let [ key, replacement ] of toPairs(metaVars)) {
            value = value.replaceAll(`{${key}}`, replacement)
        }
        return value
    }
}

getHtmlTags = (elem, props) => {
    tags = []
    for (const prop of props) {
        const attr = []
        for (const [ name, value ] of toPairs(prop)) {
            attr.push(`${name}="${value}"`)
        }
        tags.push(`<${elem} ${attr.join(' ')} />`)
    }
    return tags.join('')
}

const ext2mime = {
    png: 'image/png',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    jpg: 'image/jpeg',
    webp: 'image/webp'
}

getIconMimeType = ext => {
    return ext2mime[ext]
}

id2name = id => {
    let result = ''
    let last = 0
    for (const char of id) {
        if (/[a-z]/.test(char)) {
            if (last <= 1) {
                result += last === 0 ? char.toUpperCase() : char
            } else {
                result += ' ' + char.toUpperCase()
            }
            last = 1
        } else if (/[0-9]/.test(char)) {
            if (last === 0 || last === 2) {
                result += char
            } else {
                result += ' ' + char
            }
            last = 2
        } else {
            last = 3
        }
    }
    return result
}

module.exports = {
    getHtmlTags,
    getReplaceMetaVars,
    stringifyValues,
    getJsonObjectFromFile,
    getDefaultFromModule,
    getIconMimeType,
    id2name
}