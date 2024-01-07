const syncFs = require("../shared/classes/syncFs.cjs");
const { isObject, simpleType, toPairs} = require("../shared/classes/helper.cjs");

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
        throw Error(`Json in file ${path} must be an object but got ${typeof json}`)

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
        throw Error(`Missing required file ${path}`)
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
        throw Error(`The file ${path} must return an ${expectedType} in module.exports but got ${simpleType(json)}`)

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

module.exports = {
    stringifyValues,
    getJsonObjectFromFile,
    getDefaultFromModule
}