let logger = console

/**
 * Sets the logger for debug function to the given value
 *
 * @param {object} value
 */
const setLogger = value => logger = value

/**
 * Debug function which logs the given parameters on the console and returns the first param
 *
 * @param {mixed} main
 * @param {mixed} params
 *
 * @returns {mixed}
 */
function d(main, ...params) {
    let stack = []
    try {
        throw Error('foo')
    }
    catch (e) {
        stack = e.stack.split('\n')
    }
    const func = []
    let no = 0
    for (const line of stack) {
        const pos = no
        no++
        if (pos <= 1) continue

        if (pos === 2) {
            func.push(line.trim())
            continue
        }
        if (pos > 6) break

        const [ first ] = line.split('(')
        func.push(first.substring(6).trim())
    }
    logger.group('Debug ' + func.join(' <- '))
    logger.log(main, ...params)
    logger.groupEnd()

    return main
}

/**
 * Returns whether the given value is null or not
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
const isNull = value => value === null

/**
 * Returns whether the given value is a string or not
 * Instances of the String class will not be regarded as strings.
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
function isString(value) {
    return (typeof value === 'string' && value !== null)
}

/**
 * Returns whether the given value is an array or not
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
function isArray(value) {
    return Array.isArray(value)
}

/**
 * Returns whether the argument is an object or not
 *
 * @param {mixed} obj
 *
 * @returns {boolean}
 */
function isObject(obj) {
    return (obj && typeof obj === 'object' && !isArray(obj))
}

/**
 * Returns whether the given argument is an URL string with http or https protocol or not
 *
 * @param {mixed} value
 *
 * @returns {boolean}
 */
function isUrl(value) {
    if (!isString(value)) return false
    return /^http(s)?\:\/\/[a-zA-Z0-9]+/.test(value)
}

/**
 * Returns whether the first argument is a data URL or not
 * If a type is given the data url must also match the content type
 *
 * @param {mixed} value
 * @param {string} type
 *
 * @returns {boolean}
 */
function isDataUrl(value, type = null) {
    if (!isString(value)) return false
    return type === null ?
        /^data\:[a-zA-Z0-9]+\/[a-zA-Z0-9]+;base64\,/.test(value) :
        value.startsWith('data:' + type + ';base64,')
}

/**
 * Returns the given string with the first character converted to uppercase (if not empty)
 *
 * @param {string} value
 *
 * @returns {string}
 */
const ucfirst = (value) => {
    if (value === '') return '';
    return value[0].toUpperCase() + value.substring(1);
}

/**
 * Returns an array holding all unique elements of both given arrays
 *
 * @param {array} a
 * @param {array} b
 *
 * @returns {array}
 */
const union = (a, b) => [ ...new Set([ ...a, ...b ]) ];

/**
 * Returns the given array without the given element or elements (if an array)
 *
 * @param {array} source
 * @param {mixed|array} remove
 *
 * @returns {array}
 */
const without = (source, remove) => {
    if (!Array.isArray(remove)) remove = [remove];
    return (remove.length ? source.filter(x => !remove.includes(x)) : [ ...source ])
}

/**
 * Returns an array holding all items which are available in both given arrays
 *
 * @param {array} a
 * @param {array} b
 *
 * @returns {array}
 */
const intersect = (a, b) => {
    return [ ...new Set([ ...a ]) ].filter(x => b.includes(x))
}

/**
 * Returns a string which is trimmed of all enclosing chars which are given in the chars string.
 *
 * @param {string} value
 * @param {string} chars
 *
 * @returns {string}
 */
const trim = (value, chars) => {
    if (!chars.length) return value

    let start = 0
    while (start < value.length && chars.indexOf(value[start]) > -1) start++
    if (start === value.length) return ''

    let end = value.length - 1;
    while (end > start && chars.indexOf(value[end]) > -1) end--
    if (end < start) return ''

    return value.substring(start, end + 1)
}

/**
 * Returns a string which describes the given parameters simple type. Simple type means that instances of String or
 * Array will be not be returned as "object" lime typeof does but as "string" or "array"
 *
 * @param {mixed} value
 *
 * @returns {string}
 */
const simpleType = value => {
    if (value === undefined) return 'undefined'
    if (value === null) return 'null'
    const type = typeof value
    if (type !== 'object') return type
    if (Array.isArray(value)) return 'array'
    if (value instanceof String) return 'string'

    return 'object'
}

/**
 * Returns an array which holds all trimmed values of the given csv line which are seperated by a comma
 *
 * @param {string} csv
 *
 * @returns {array}
 */
const csv2values = csv => {
    if (csv.trim() === '') return []
    const values = []
    const items = csv.split(',')
    for (const item of items) {
        values.push(item.trim())
    }
    return values
}

/**
 * Returns an array with information objects for each part of the given version string.
 * The information object includes the "number" as integer and also an "appendix" string, which contains all characters
 * following the number
 *
 * @param {string} version
 *
 * @returns {array}
 */
const getVersionParts = version => {
    const parts = trim(version, 'v').split('.')
    const result = []
    for (const part of parts) {
        let digits = ''
        let appendix = ''
        let isAppendix = false
        for (const char of part) {
            if (char < '0' || char > '9') isAppendix = true
            if (isAppendix) {
                appendix += char
            } else {
                digits += char
            }

        }
        result.push({number: parseInt(digits, 10), appendix})
    }
    return result
}

/**
 * Returns whether the given version number is higher or equal to the required version number
 *
 * @param {string} actual
 * @param {string} required
 *
 * @returns {boolean}
 */
const isVersionEqualOrHigher = (actual, required) => {
    const actualParts = getVersionParts(actual)
    const requiredParts = getVersionParts(required)
    const iMax = Math.min(actualParts.length, requiredParts.length)
    for (let i = 0; i < iMax; i++) {
        const actElem = actualParts[i]
        const reqElem = requiredParts[i]
        if (actElem.number < reqElem.number) return false
        if (actElem.number > reqElem.number) return true
        if (actElem.appendix === reqElem.appendix) continue
        return actElem.appendix === ''
    }
    return true
}

const regexpEscape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const stringList = values => {
    if (!values.length) return ''

    const items = [ ...values ]
    const last = items.pop()

    const result = items.length ? '"' + items.join('", "') + '" or ' : ''

    return result + `"${last}"`
}

/**
 * Returns an array holding the entries (= array with id and value) of a given object
 *
 */
const toPairs = Object.entries

/**
 * Returns an array holding the values of a given object
 */
const toValues = Object.values

/**
 * Returns an array holding the keys of a given object
 */
const toKeys = Object.keys

module.exports = {
    setLogger,
    d,
    isNull,
    isString,
    isArray,
    isObject,
    isUrl,
    isDataUrl,
    ucfirst,
    union,
    without,
    intersect,
    trim,
    simpleType,
    csv2values,
    isVersionEqualOrHigher,
    regexpEscape,
    stringList,
    toPairs,
    toValues,
    toKeys
}