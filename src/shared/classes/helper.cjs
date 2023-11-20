function d(main, ...params) {
    let stack = null;
    try {
        throw new Error('myError');
    }
    catch(e) {
        stack = e.stack.split('\n');
    }
    const func = [];
    let no = 0;
    for (let line of stack) {
        const pos = no;
        no++;
        if (pos <= 1) {
            continue;
        } else if (pos === 2) {
            func.push(line.trim());
            continue;
        } else if (pos > 6) {
            break;
        }
        line = line.split('(');
        func.push(line[0].substr(6).trim());
    }
    console.group('Debug ' + func.join(' <- '));
    console.log(main, ...params);
    console.groupEnd();
    return main;
}

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
 * @param {midex} value
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
 * Returns whether the argument is an object or not
 *
 * @param {mixed} obj
 *
 * @returns {boolean}
 */
function isObject(obj) {
    return (obj && typeof obj === 'object' && !isArray(obj))
}

const ucfirst = (value) => {
    if (value === '') return '';
    return value[0].toUpperCase() + value.substring(1);
};

const union = (a, b) => [ ...new Set([ ...a, ...b ]) ];

const without = (source, remove) => {
    if (!Array.isArray(remove)) remove = [remove];
    return (remove.length ? source.filter(x => !remove.includes(x)) : [ ...source ])
}

const intersect = (a, b) => {
    return a.filter(x => b.includes(x))
}

const toPairs = Object.entries
const toValues = Object.values
const toKeys = Object.keys

module.exports = {
    d,
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