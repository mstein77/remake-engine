const syncFs = require("../shared/classes/syncFs.cjs");
const { isObject, simpleType, toPairs} = require("../shared/classes/helper.cjs");
const getJsonObject = path => {
    const json = syncFs.readJson(path)
    if (!isObject(json))
        throw Error(`Json in file ${path} must be an object but got ${typeof json}`)

    return json
}

const WrappedError = (prefix, error, printStack = false) => {
    const wrapped = Error(prefix + ': ' + error.message)
    wrapped.stack = error.stack
    if (printStack)
        wrapped.printStack = true

    return wrapped
}

const getJsonFromModule = (path, expectedType = 'object') => {
    if (!syncFs.fileExists(path))
        throw Error(`Missing required file ${path}`)

    let json
    try {
        json = require(path)
    } catch (e) {
        if (e instanceof SyntaxError)
            throw WrappedError(`Error parsing config file ${path}`, e, true)
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
    getJsonObject,
    getJsonFromModule
}