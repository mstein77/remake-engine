const RESOURCE = {
    TYPE: {
        JSON: '1',
        IMAGE: '2',
        AUDIO: '3'
    }
}
RESOURCE.PREFIX = {
    [RESOURCE.TYPE.JSON]: 'j',
    [RESOURCE.TYPE.IMAGE]: 'i',
    [RESOURCE.TYPE.AUDIO]: 'a'
}
RESOURCE.TEXT = {
    [RESOURCE.TYPE.JSON]: 'json',
    [RESOURCE.TYPE.IMAGE]: 'image',
    [RESOURCE.TYPE.AUDIO]: 'audio'
}
RESOURCE.KEY = {
    [RESOURCE.TYPE.JSON]: 'json',
    [RESOURCE.TYPE.IMAGE]: 'image',
    [RESOURCE.TYPE.AUDIO]: 'audio'
}

const tid2id = tid => tid.substring(1)

const text2id = {}
for (const [ id, text ] of Object.entries(RESOURCE.TEXT)) {
    text2id[text] = id
}

const prefix2type = {}
for (const [ type, prefix ] of Object.entries(RESOURCE.PREFIX)) {
    prefix2type[prefix] = type
}

const tid2type = tid => {
    if (!tid)
        throw Error('Empty typed resource id given')

    const type = prefix2type[tid[0]]
    if (!type)
        throw Error(`Could not extract type from typed id "${tid}"`)

    return type
}


const jsonPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.JSON]
const imagePrefix = RESOURCE.PREFIX[RESOURCE.TYPE.IMAGE]
const audioPrefix = RESOURCE.PREFIX[RESOURCE.TYPE.AUDIO]
const id2jsonTid = id => jsonPrefix + id
const id2imageTid = id => imagePrefix + id
const id2audioTid = id => audioPrefix + id

const type2tid = {
    [RESOURCE.TYPE.JSON]: id2jsonTid,
    [RESOURCE.TYPE.IMAGE]: id2imageTid,
    [RESOURCE.TYPE.AUDIO]: id2audioTid
}

const id2tid = (type, id) => {
    const func = type2tid[type]
    if (!func)
        throw Error(`Invalid resource type "${type}" given!`);

    return func(id)
}
const typeText2tid = (typeText, id) => {
    const type = text2id[typeText]
    if (type === undefined)
        throw Error(`Could not find type matching "${typeText}"`)

    return id2tid(type, id)
}

const resId2tid = resId => {
    const index = resId.indexOf(':')
    if (index === -1)
        throw Error(`Invalid resource id "${resId}" given`)

    return id2tid(text2id[resId.substring(0, index)], resId.substring(index + 1))
}

const tid2typeText = tid => RESOURCE.TEXT[tid2type(tid)]

module.exports = {
    RESOURCE,
    id2tid,
    tid2id,
    tid2type,
    tid2typeText,
    text2id,
    prefix2type,
    type2tid,
    typeText2tid,
    resId2tid
}
