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

/**
 * Returns a function which replaces metaVars which are given as "{<name>}" or "{config.<name>>}" for config vars in
 * the argument string with corresponding meta or config value
 *
 * @param {object} metaVars
 * @param {object|undefined} configVars
 *
 * @returns {function}
 */
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

/**
 * Returns a string holding a html tag of the given element for each property mapping given in the props array
 *
 * @param {string} elem
 * @param {array} props
 *
 * @returns {string}
 */
getHtmlTags = (elem, props) => {
    const tags = []
    for (const prop of props) {
        const attr = []
        for (const [ name, value ] of toPairs(prop)) {
            attr.push(`${name}="${value}"`)
        }
        const space = attr.length ? ' ' : ''
        tags.push(`<${elem}${space}${attr.join(' ')}>`)
    }
    return tags.join('')
}

/**
 * Maps image file extensions to their mime type
 *
 * @type {object}
 */
const ext2mime = {
    png: 'image/png',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    jpg: 'image/jpeg',
    webp: 'image/webp'
}

/**
 * Returns the mime type for the given file extension or undefined if its not supported
 *
 * @param {string} ext
 *
 * @returns {string}
 */
getIconMimeType = ext => {
    return ext2mime[ext]
}

/**
 * Returns a string holding a name representation of the given id
 * This means that a camel-cased id will be split into words starting with a capital letter. Numbers will also be
 * regarded as a word
 *
 * @param {string} id
 *
 * @returns {string}
 */
id2name = id => {
    let result = ''
    let last = 0
    for (const char of id) {
        if (/[a-z]/.test(char)) {
            // current char is lowercased letter
            if (last <= 1) {
                // last was lowercased or nothing
                result += last === 0 ? char.toUpperCase() : char // add capital if nothing, otherwise append
            } else if (last === 2) {
                result += ' ' + char.toUpperCase()
            } else {
                // last was capital or number
                result += char // start new word with capital variant
            }
            last = 1  // = last letter was lower cased
        } else if (/[0-9]/.test(char)) {
            // current char is number
            if (last === 0 || last === 2) {
                // last was beginning or number => append
                result += char
            } else {
                // last was letter => append number as new word
                result += ' ' + char
            }
            last = 2 // = last letter was digit
        } else {
            // current char is capital letter
            if (last === 0 || last === 3) {
                result += char
            } else {
                result += ' ' + char
            }
            last = 3 // last letter was capital letter
        }
    }
    return result
}

/**
 * Holds the shared argument description for build scripts
 *
 * @type {{matchers: RegExp[], flags: {q: string, a: string, d: string, v: string, h: string, i: string, m: string, n: string}, options: {all: {desc: string}, normal: {desc: string}, help: {desc: string}, minimal: {desc: string}, detailed: {desc: string}, quiet: {desc: string}, info: {desc: string}, verbose: {desc: string}}}}
 */
const argInfoGame = {
    flags: { i: 'info', d: 'detailed', m: 'minimal', n: 'normal', q: 'quiet', h: 'help', v: 'verbose', a: 'all'},
    options: {
        info: {desc: 'Build but only show package information in the browser'},
        quiet: {desc: 'Build with no logging'},
        minimal: {desc: 'Build with minimal logging'},
        normal: {desc: 'Build with normal logging'},
        detailed: {desc: 'Build with detailed logging'},
        verbose: {desc: 'Build with verbose logging'},
        all: {desc: 'Apply buildLogging to serverLogging'},
        help: {desc: 'Show help'}
    },
    matchers: [
        /^[a-z0-9_]+$/i
    ]
}

module.exports = {
    getHtmlTags,
    getReplaceMetaVars,
    stringifyValues,
    getJsonObjectFromFile,
    getDefaultFromModule,
    getIconMimeType,
    id2name,
    argInfoGame
}