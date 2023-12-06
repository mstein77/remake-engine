/**
 * Debug function which logs the given parameters on the console and returns the first param
 *
 * @param {mixed} main
 * @param {mixed} params
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
    console.group('Debug ' + func.join(' <- '))
    console.log(main, ...params)
    console.groupEnd()

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
 * @returns {array}
 */
const intersect = (a, b) => {
    return [ ...new Set([ ...a ]) ].filter(x => b.includes(x))
}

const toPairs = Object.entries
const toValues = Object.values
const toKeys = Object.keys

module.exports = {
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
    toPairs,
    toValues,
    toKeys
}