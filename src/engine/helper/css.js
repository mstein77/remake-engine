const key2cssConstName = new Map()
const cssConstKey2type = new Map()

const cssConstTypes = [
    'rgb', 'rgba', 'px', 'urls', 'url', 'font', 'bstyle', 'float', 'perc', 'grad', 'type'
]

const regexpCamelCaseLast = /([A-Z][a-z]*)$/

const getTypeForCssConstKey = key => {
    if (!cssConstKey2type.has(key)) {
        const match = key.match(regexpCamelCaseLast)
        if (match === null || match.length < 2) return

        const type = match[1].toLowerCase();
        if (!type || !cssConstTypes.includes(type)) return
        cssConstKey2type.set(key, type)
    }
    return cssConstKey2type.get(key)
}

const getCssConstNameForKey = key => {
    if (!key2cssConstName.has(key)) {
        const parts = []
        let i = 0
        let currPart = ''
        while (i < key.length) {
            let char = key[i]
            if (char >= 'A' && char <= 'Z') {
                parts.push(currPart)
                currPart = ''
                char = char.toLowerCase()
            }
            currPart += char
            i++
        }
        if (currPart !== '') {
            parts.push(currPart)
        }
        key2cssConstName.set(key, '--' + parts.join('-'))
    }
    return key2cssConstName.get(key)
}

const setStyleConstByKey = (style, key, value) => {
    const type = getTypeForCssConstKey(key);
    if (!type) return;

    if (['type', 'perc'].includes(type) && typeof value === 'string') {
        value = parseInt(value, 10);
    }
    let cssValue = value;
    if (type === 'px' && !(value === 'none' && (key.startsWith('max') || key.startsWith('end')))) {
        cssValue += 'px'
    } else if (type === 'perc') {
        cssValue += '%'
    }
    style.setProperty(getCssConstNameForKey(key), cssValue)
    return value
}

const extractConstNamesAndTypes = obj => {
    for (const key of Object.keys(obj)) {
        if (!getTypeForCssConstKey(key)) continue
        getCssConstNameForKey(key)
    }
}

const getConstValues = (source, target = {}) => {
    for (const [ key, value ] of Object.entries(source)) {
        const keyType = getTypeForCssConstKey(key)
        if (!keyType || target[key] !== undefined) continue

        let propValue = value
        switch (keyType) {
            case 'perc':
                if (typeof value === 'string') {
                    value = value.substr(0, value.length - 1)
                    propValue = parseInt(value, 10)
                }
                break

            case 'type':
                propValue = parseInt(value, 10)
                break
        }
        target[key] = propValue
    }
    return target
}

/**
 * Returns the unit and the value of the given CSS value or null if the string could not be parsed
 */
const getParsedStyleValue = value => {
    if (typeof value !== 'string') return

    if (value.endsWith('px')) {
        return {unit: 'px', value: parseInt(value.substring(0, value.length - 2), 10)}
    }
    return
}

/**
 * Returns the integer of the given CSS pixel value or the def value if the value does not represent a pixel value
 */
const getCssPxValue = (value, def) => {
    const parsed = getParsedStyleValue(value)
    if (!parsed || parsed.unit !== 'px') return def
    return parsed.value
}

export {
    getTypeForCssConstKey,
    getCssConstNameForKey,
    getParsedStyleValue,
    getCssPxValue,
    setStyleConstByKey,
    extractConstNamesAndTypes,
    getConstValues
}